/**
 * Education tools for ethereum-mcp
 *
 * Tools for surfacing Web3 teaching moments through interactive checklists.
 * Helps developers learn critical concepts like decimals, incentive design,
 * and automation patterns as they build.
 */

import {
  LESSONS,
  CATEGORY_INFO,
  getLessonsByCategory,
  getLessonById,
  findRelevantLessons,
  type Category,
  type Lesson,
} from "../education/index.js";

/**
 * Format a lesson for checklist display (short form)
 */
function formatLessonShort(lesson: Lesson) {
  return {
    id: lesson.id,
    severity: lesson.severity,
    question: lesson.question,
    warning: lesson.short,
  };
}

/**
 * Format a lesson with full details
 */
function formatLessonFull(lesson: Lesson) {
  return {
    id: lesson.id,
    category: lesson.category,
    categoryName: CATEGORY_INFO[lesson.category].name,
    severity: lesson.severity,
    question: lesson.question,
    warning: lesson.short,
    explanation: lesson.explanation,
    wrongExample: lesson.wrongExample || null,
    rightExample: lesson.rightExample || null,
    relatedDocs: lesson.relatedDocs || [],
  };
}

export const educationTools = {
  /**
   * education.getChecklist - Get an interactive checklist for a category
   */
  getChecklist: {
    name: "education_getChecklist",
    description: `Get an interactive checklist of Web3 considerations for a specific category.

Use this to walk developers through important concepts as teaching moments.

Categories:
- tokens: Decimals, approvals, transfers (CRITICAL: USDC has 6 decimals!)
- math: Percentages, rounding, precision (CRITICAL: No floats in Solidity!)
- automation: Triggers, keepers, incentives (CRITICAL: Nothing is automatic!)
- security: Reentrancy, access control, oracles
- vaults: ERC-4626, share accounting, inflation attacks
- defi: MEV, slippage, liquidity, protocol integration
- all: Get all lessons

Returns questions with short warnings. Use education_explainLesson for deep dives.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: ["tokens", "math", "automation", "security", "vaults", "defi", "all"],
          description: "Category of lessons to retrieve",
        },
      },
      required: ["category"],
    },
    handler: async (args: { category: string }) => {
      const category = args.category as Category | "all";

      // Validate category
      if (category !== "all" && !CATEGORY_INFO[category as Category]) {
        return {
          success: false,
          error: `Unknown category: ${category}. Valid: tokens, math, automation, security, vaults, defi, all`,
        };
      }

      const lessons = getLessonsByCategory(category);

      // Group by severity for prioritization
      const critical = lessons.filter((l) => l.severity === "critical");
      const high = lessons.filter((l) => l.severity === "high");
      const medium = lessons.filter((l) => l.severity === "medium");

      // Build checklist
      const checklist = lessons.map(formatLessonShort);

      const response: {
        success: boolean;
        category: string;
        categoryInfo?: { name: string; description: string };
        summary: {
          total: number;
          critical: number;
          high: number;
          medium: number;
        };
        guidance: string;
        checklist: ReturnType<typeof formatLessonShort>[];
      } = {
        success: true,
        category: category,
        summary: {
          total: lessons.length,
          critical: critical.length,
          high: high.length,
          medium: medium.length,
        },
        guidance:
          "Walk through each question with the developer. For deeper explanations, use education_explainLesson with the lesson ID.",
        checklist,
      };

      // Add category info if not "all"
      if (category !== "all") {
        response.categoryInfo = CATEGORY_INFO[category as Category];
      }

      return response;
    },
  },

  /**
   * education.explainLesson - Get full explanation for a specific lesson
   */
  explainLesson: {
    name: "education_explainLesson",
    description: `Get the full explanation and code examples for a specific lesson.

Use this when a developer wants to understand the "why" behind a warning,
or when you need to show them correct vs incorrect code patterns.

Includes:
- Deep explanation of the concept
- Code example of what NOT to do (common mistake)
- Code example of the RIGHT way
- Links to related documentation`,
    inputSchema: {
      type: "object" as const,
      properties: {
        lessonId: {
          type: "string",
          description:
            "The lesson ID to explain (e.g., 'decimals-vary', 'nothing-automatic', 'reentrancy')",
        },
      },
      required: ["lessonId"],
    },
    handler: async (args: { lessonId: string }) => {
      const lesson = getLessonById(args.lessonId);

      if (!lesson) {
        // List available lesson IDs
        const availableIds = LESSONS.map((l) => l.id).join(", ");
        return {
          success: false,
          error: `Lesson '${args.lessonId}' not found. Available: ${availableIds}`,
        };
      }

      return {
        success: true,
        lesson: formatLessonFull(lesson),
      };
    },
  },

  /**
   * education.suggestLessons - Suggest relevant lessons based on description
   */
  suggestLessons: {
    name: "education_suggestLessons",
    description: `Given a project description or plan, suggest which lessons are most relevant.

Use this at the START of a project to identify potential pitfalls early.

Example inputs:
- "Build a USDC vault with 5% APY"
- "Create a token swap aggregator"
- "Make a staking contract with daily rewards"

Returns the most relevant lessons based on keywords, prioritized by severity.`,
    inputSchema: {
      type: "object" as const,
      properties: {
        description: {
          type: "string",
          description: "Project description or development plan to analyze",
        },
        limit: {
          type: "number",
          description: "Maximum number of lessons to return (default: 5)",
        },
      },
      required: ["description"],
    },
    handler: async (args: { description: string; limit?: number }) => {
      const limit = args.limit || 5;
      const relevantLessons = findRelevantLessons(args.description, limit);

      if (relevantLessons.length === 0) {
        return {
          success: true,
          description: args.description,
          lessonsFound: 0,
          message:
            "No specific lessons matched. Consider using education_getChecklist with category 'all' for a comprehensive review.",
          suggestions: [],
        };
      }

      // Format suggestions with actionable guidance
      const suggestions = relevantLessons.map((lesson) => ({
        id: lesson.id,
        category: lesson.category,
        severity: lesson.severity,
        warning: lesson.short,
        question: lesson.question,
        whyRelevant: `Detected keywords related to ${CATEGORY_INFO[lesson.category].name.toLowerCase()}`,
      }));

      // Count by severity
      const criticalCount = relevantLessons.filter((l) => l.severity === "critical").length;

      return {
        success: true,
        description: args.description,
        lessonsFound: relevantLessons.length,
        criticalIssues: criticalCount,
        message:
          criticalCount > 0
            ? `Found ${criticalCount} CRITICAL lesson(s) relevant to your plan. Review these first!`
            : `Found ${relevantLessons.length} relevant lesson(s) for your plan.`,
        suggestions,
        nextStep:
          "Use education_explainLesson with any lesson ID for full details and code examples.",
      };
    },
  },

  /**
   * education.listCategories - List all available lesson categories
   */
  listCategories: {
    name: "education_listCategories",
    description: `List all available lesson categories with descriptions.

Use this to understand what topics are covered and help developers
choose which checklist to work through.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const categories = Object.entries(CATEGORY_INFO).map(([id, info]) => {
        const lessons = getLessonsByCategory(id as Category);
        const critical = lessons.filter((l) => l.severity === "critical").length;
        const high = lessons.filter((l) => l.severity === "high").length;

        return {
          id,
          name: info.name,
          description: info.description,
          lessonCount: lessons.length,
          criticalLessons: critical,
          highLessons: high,
        };
      });

      return {
        success: true,
        totalLessons: LESSONS.length,
        categories,
        recommendation:
          "Start with 'automation' category - understanding incentives is the most important Web3 concept!",
      };
    },
  },

  /**
   * education.getCriticalLessons - Get all critical severity lessons
   */
  getCriticalLessons: {
    name: "education_getCriticalLessons",
    description: `Get all CRITICAL severity lessons - the most important gotchas that cause major bugs.

These are the lessons that, if ignored, lead to:
- Loss of user funds
- Contract exploits
- Catastrophic failures

ALWAYS review critical lessons before deploying any contract.`,
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
    handler: async () => {
      const criticalLessons = LESSONS.filter((l) => l.severity === "critical");

      return {
        success: true,
        message:
          "These are MUST-KNOW concepts. Ignoring them leads to exploits and lost funds.",
        count: criticalLessons.length,
        lessons: criticalLessons.map((lesson) => ({
          id: lesson.id,
          category: lesson.category,
          categoryName: CATEGORY_INFO[lesson.category].name,
          question: lesson.question,
          warning: lesson.short,
        })),
        guidance:
          "Use education_explainLesson for detailed explanations and code examples.",
      };
    },
  },
};
