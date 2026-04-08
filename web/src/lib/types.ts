export interface Message {
  id: string;
  chat_jid: string;
  sender: string;
  sender_name: string;
  content: string;
  timestamp: string;
  is_from_me: number;
  is_bot_message: number;
}

export interface ScheduledTask {
  id: string;
  group_folder: string;
  prompt: string;
  schedule_type: string;
  schedule_value: string;
  status: string;
  next_run: string | null;
}

export interface ShareToken {
  token: string;
  label: string;
  permissions: string;
  group_folder: string;
  created_at: string;
  expires_at: string | null;
  active: number;
}

export interface Group {
  jid: string;
  name: string;
  folder: string;
  is_main: number;
}

export interface KanbanSection {
  title: string;
  emoji: string;
  tasks: KanbanTask[];
}

export interface KanbanTask {
  title: string;
  goalState?: string;
  currentState?: string;
  nextAction?: string;
  firstTenSeconds?: string;
  flags?: string[];
}
