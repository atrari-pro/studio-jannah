// frappe-gantt ne publie pas de types officiels (vanilla JS). Déclaration
// minimale — juste ce qu'Admin.tsx utilise réellement, pas l'API complète.
declare module "frappe-gantt" {
  export interface FrappeGanttTask {
    id: string;
    name: string;
    start: string;
    end: string;
    progress?: number;
    dependencies?: string;
    custom_class?: string;
  }

  export interface FrappeGanttOptions {
    view_mode?: "Day" | "Week" | "Month" | "Year";
    date_format?: string;
    on_click?: (task: FrappeGanttTask) => void;
    on_date_change?: (task: FrappeGanttTask, start: Date, end: Date) => void;
    readonly_dates?: boolean;
    readonly_progress?: boolean;
  }

  export default class Gantt {
    constructor(wrapper: string | HTMLElement, tasks: FrappeGanttTask[], options?: FrappeGanttOptions);
    refresh(tasks: FrappeGanttTask[]): void;
    change_view_mode(mode: "Day" | "Week" | "Month" | "Year"): void;
  }
}
