import { z } from "zod";

/**
 * The edit recipe (#85): a small, non-destructive description of how a
 * creator's on-device edit produced the uploaded video from their original
 * file. Storing the recipe (not the raw file) keeps re-editing possible
 * later while the original stays on the creator's device.
 */
export const editRecipeSchema = z.object({
  rotation: z.union([
    z.literal(0),
    z.literal(90),
    z.literal(180),
    z.literal(270),
  ]),
  segments: z
    .array(
      z
        .object({
          end: z.number().positive(),
          start: z.number().min(0),
        })
        .refine(({ end, start }) => end > start, {
          message: "Segment end must be after its start",
        })
    )
    .min(1)
    .max(64),
  sourceDurationSeconds: z.number().positive(),
  version: z.literal(1),
});

export type EditRecipe = z.infer<typeof editRecipeSchema>;

export interface EditRecipeSegment {
  end: number;
  start: number;
}

/** Sorts segments by start time so recipes read consistently everywhere. */
export const serializeEditRecipe = (recipe: EditRecipe): string =>
  JSON.stringify({
    ...recipe,
    segments: [...recipe.segments].toSorted((left, right) =>
      left.start === right.start
        ? left.end - right.end
        : left.start - right.start
    ),
  });

export const parseEditRecipe = (
  stored: string | null | undefined
): EditRecipe | null => {
  if (!stored) {
    return null;
  }
  try {
    return editRecipeSchema.parse(JSON.parse(stored));
  } catch {
    // Corrupt or outdated recipes degrade to "no recipe".
    return null;
  }
};
