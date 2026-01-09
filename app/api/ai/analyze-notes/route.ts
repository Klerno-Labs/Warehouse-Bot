import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/app/api/_utils/getSessionUser';
import storage from '@/server/storage';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

/**
 * POST /api/ai/analyze-notes
 * Analyze production order notes to identify inventory discrepancies
 *
 * Request body:
 * {
 *   startDate?: string,  // ISO date string
 *   endDate?: string,    // ISO date string
 *   itemSku?: string     // Optional: analyze specific item
 * }
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { startDate, endDate, itemSku } = body;

    // Build query filters
    const where: any = {
      productionOrder: {
        tenantId: user.tenantId,
      },
      OR: [
        { noteType: 'issue' },
        { noteType: 'part_replacement' },
      ],
    };

    if (startDate) {
      where.createdAt = { ...where.createdAt, gte: new Date(startDate) };
    }
    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    // Fetch notes from production orders
    const notes = await storage.productionOrderNote.findMany({
      where,
      include: {
        productionOrder: {
          include: {
            item: {
              select: { sku: true, name: true },
            },
          },
        },
        createdBy: {
          select: { firstName: true, lastName: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 500, // Limit to recent 500 notes
    });

    // Filter by item if specified
    const filteredNotes = itemSku
      ? notes.filter((note) => note.productionOrder.item.sku === itemSku)
      : notes;

    if (filteredNotes.length === 0) {
      return NextResponse.json({
        insights: {
          summary: 'No issue or part replacement notes found in the specified time period.',
          patterns: [],
          recommendations: [],
        },
        notesAnalyzed: 0,
      });
    }

    // Format notes for AI analysis
    const notesText = filteredNotes
      .map((note) => {
        const userName = `${note.createdBy.firstName} ${note.createdBy.lastName}`;
        const date = new Date(note.createdAt).toLocaleDateString();
        const orderNumber = note.productionOrder.orderNumber;
        const itemInfo = `${note.productionOrder.item.sku} - ${note.productionOrder.item.name}`;

        return `[${date}] Order ${orderNumber} (${itemInfo}) - ${userName} (${note.noteType}):\n${note.content}`;
      })
      .join('\n\n---\n\n');

    // Analyze with Claude
    const prompt = `You are an inventory management analyst. Analyze the following production order notes from operators on the factory floor. These notes document issues and part replacements during production.

Your task is to:
1. Identify patterns of missing inventory or part shortages
2. Determine which issues were documented vs. undocumented inventory problems
3. Spot recurring issues with specific parts or items
4. Provide actionable recommendations to prevent future discrepancies

Production Order Notes:
${notesText}

Provide your analysis in JSON format with this structure:
{
  "summary": "Brief overview of key findings (2-3 sentences)",
  "patterns": [
    {
      "type": "documented_shortage | undocumented_shortage | part_quality | operator_error | process_issue",
      "description": "What the pattern is",
      "frequency": "How often it occurs",
      "affectedItems": ["SKU1", "SKU2"],
      "severity": "low | medium | high | critical"
    }
  ],
  "inventoryDiscrepancies": [
    {
      "itemSku": "The SKU of the affected item",
      "issue": "Description of the discrepancy",
      "wasDocumented": true/false,
      "notes": "Which notes mention this"
    }
  ],
  "recommendations": [
    {
      "priority": "high | medium | low",
      "action": "Specific action to take",
      "expectedImpact": "What this will improve"
    }
  ]
}`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';

    // Try to parse JSON from the response
    let insights;
    try {
      // Look for JSON in code blocks or raw text
      const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) ||
                       responseText.match(/(\{[\s\S]*\})/);

      if (jsonMatch) {
        insights = JSON.parse(jsonMatch[1]);
      } else {
        // Fallback if no JSON found
        insights = {
          summary: responseText,
          patterns: [],
          inventoryDiscrepancies: [],
          recommendations: [],
        };
      }
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      insights = {
        summary: responseText,
        patterns: [],
        inventoryDiscrepancies: [],
        recommendations: [],
      };
    }

    return NextResponse.json({
      insights,
      notesAnalyzed: filteredNotes.length,
      dateRange: {
        start: startDate || 'All time',
        end: endDate || 'Present',
      },
    });
  } catch (error) {
    console.error('Error analyzing notes:', error);
    return NextResponse.json(
      { error: 'Failed to analyze notes' },
      { status: 500 }
    );
  }
}
