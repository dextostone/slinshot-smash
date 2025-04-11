'use server';
/**
 * @fileOverview Adjusts the game difficulty based on player performance.
 *
 * - adjustDifficulty - A function that adjusts the game difficulty.
 * - AdjustDifficultyInput - The input type for the adjustDifficulty function.
 * - AdjustDifficultyOutput - The return type for the adjustDifficulty function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';

const AdjustDifficultyInputSchema = z.object({
  playerScore: z.number().describe('The player\'s current score.'),
  level: z.number().describe('The current level number.'),
  birdsUsed: z.number().describe('The number of birds used in the current level.'),
  structuresDestroyed: z.number().describe('The number of structures destroyed in the current level.'),
});
export type AdjustDifficultyInput = z.infer<typeof AdjustDifficultyInputSchema>;

const AdjustDifficultyOutputSchema = z.object({
  newLevelStructure: z.string().describe('A JSON string representing the new level structure configuration.'),
  difficultyAdjustmentReason: z.string().describe('The reason for the difficulty adjustment.'),
});
export type AdjustDifficultyOutput = z.infer<typeof AdjustDifficultyOutputSchema>;

export async function adjustDifficulty(input: AdjustDifficultyInput): Promise<AdjustDifficultyOutput> {
  return adjustDifficultyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'adjustDifficultyPrompt',
  input: {
    schema: z.object({
      playerScore: z.number().describe('The player\'s current score.'),
      level: z.number().describe('The current level number.'),
      birdsUsed: z.number().describe('The number of birds used in the current level.'),
      structuresDestroyed: z.number().describe('The number of structures destroyed in the current level.'),
    }),
  },
  output: {
    schema: z.object({
      newLevelStructure: z.string().describe('A JSON string representing the new level structure configuration.'),
      difficultyAdjustmentReason: z.string().describe('The reason for the difficulty adjustment.'),
    }),
  },
  prompt: `You are an AI game designer who is responsible for adjusting the difficulty of the game based on the player\'s performance.

You will be given the player\'s current score, the current level number, the number of birds used, and the number of structures destroyed.

Based on this information, you will adjust the difficulty of the game by modifying the level structure.

Specifically you will respond with a JSON string representing the new level structure configuration. This string must be parseable by JSON.parse.
Also respond with the reason for the difficulty adjustment, such as "The player is performing very well, so the difficulty is being increased."

Player Score: {{{playerScore}}}
Level: {{{level}}}
Birds Used: {{{birdsUsed}}}
Structures Destroyed: {{{structuresDestroyed}}}
`,
});

const adjustDifficultyFlow = ai.defineFlow<
  typeof AdjustDifficultyInputSchema,
  typeof AdjustDifficultyOutputSchema
>(
  {
    name: 'adjustDifficultyFlow',
    inputSchema: AdjustDifficultyInputSchema,
    outputSchema: AdjustDifficultyOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
