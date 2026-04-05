import type { KanbanSection, KanbanTask } from "./types";

/**
 * Parse a kanban.md file into structured KanbanSection[] data.
 *
 * Expected format:
 *   ## <emoji> <SECTION TITLE>
 *   ### <Task Title>
 *   **ゴール状態**: ...
 *   **現在の状態**: ...
 *   **ネクストアクション**: ...
 *   - 最初の10秒: ...
 *   **⚠️ 慢性回避フラグ**
 */
export function parseKanban(markdown: string): KanbanSection[] {
  const sections: KanbanSection[] = [];

  // Split by ## headings (section-level)
  const sectionBlocks = markdown.split(/^## /m);

  for (const block of sectionBlocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split("\n");
    const heading = lines[0].trim();

    // Extract emoji (first character/codepoint) and title from heading
    // Heading looks like: "🔴 IN PROGRESS" or "🟡 PENDING"
    const emojiMatch = heading.match(
      /^([\p{Emoji_Presentation}\p{Emoji}\u{FE0F}\u{200D}]+)\s+(.+)$/u
    );

    let emoji = "";
    let sectionTitle = heading;
    if (emojiMatch) {
      emoji = emojiMatch[1];
      sectionTitle = emojiMatch[2].trim();
    }

    // Split section body into task blocks by ### headings
    const bodyText = lines.slice(1).join("\n");
    const taskBlocks = bodyText.split(/^### /m);

    const tasks: KanbanTask[] = [];
    for (const taskBlock of taskBlocks) {
      const taskTrimmed = taskBlock.trim();
      if (!taskTrimmed) continue;

      const taskLines = taskTrimmed.split("\n");
      const title = taskLines[0].trim();
      const taskBody = taskLines.slice(1).join("\n");

      const task: KanbanTask = { title };

      // Extract goal state
      const goalMatch = taskBody.match(
        /\*\*ゴール状態\*\*[:\s]*\n?([\s\S]*?)(?=\n\*\*|$)/
      );
      if (goalMatch) {
        task.goalState = goalMatch[1].trim();
      }

      // Extract current state
      const currentMatch = taskBody.match(
        /\*\*現在の状態\*\*[:\s]*\n?([\s\S]*?)(?=\n\*\*|$)/
      );
      if (currentMatch) {
        task.currentState = currentMatch[1].trim();
      }

      // Extract next action
      const nextMatch = taskBody.match(
        /\*\*ネクストアクション\*\*[:\s]*\n?([\s\S]*?)(?=\n-\s最初の10秒|\n\*\*|$)/
      );
      if (nextMatch) {
        task.nextAction = nextMatch[1].trim();
      }

      // Extract first ten seconds
      const firstTenMatch = taskBody.match(
        /-\s*最初の10秒[:\s]*(.+)/
      );
      if (firstTenMatch) {
        task.firstTenSeconds = firstTenMatch[1].trim();
      }

      // Check for chronic avoidance flag
      const flags: string[] = [];
      if (taskBody.includes("⚠️ 慢性回避フラグ")) {
        flags.push("chronic-avoidance");
      }
      if (flags.length > 0) {
        task.flags = flags;
      }

      tasks.push(task);
    }

    sections.push({
      title: sectionTitle,
      emoji,
      tasks,
    });
  }

  return sections;
}
