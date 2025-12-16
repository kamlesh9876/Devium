export type TaskStatus = 'todo' | 'in-progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TaskDependency {
    taskId: string;
    taskName: string;
    isBlocking: boolean; // true if this task must be completed before current task
}

export interface WorkflowStep {
    id: string;
    name: string;
    status: TaskStatus;
    order: number;
    isRequired: boolean;
    assignToRole?: string;
}

export interface CustomWorkflow {
    id: string;
    projectId: string;
    name: string;
    steps: WorkflowStep[];
    defaultAssignee?: string;
}

export interface Task {
    id: string;
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    projectId: string;
    projectName: string;
    assignedTo: string; // User ID
    assignedToName: string;
    createdBy: string; // User ID
    createdByName: string;
    createdAt: string;
    updatedAt: string;
    dueDate?: string;
    estimatedHours?: number;
    actualHours?: number;
    progress: number; // 0-100
    tags: string[];
    dependencies: TaskDependency[];
    blockedBy: string[]; // Task IDs that block this task
    blocks: string[]; // Task IDs that this task blocks
    workflowId?: string;
    workflowStep?: string;
    attachments: string[];
    comments: TaskComment[];
    subtasks: string[]; // Task IDs of subtasks
    parentTask?: string; // Task ID of parent task if this is a subtask
}

export interface TaskComment {
    id: string;
    taskId: string;
    userId: string;
    userName: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}

export interface WorkloadMetrics {
    userId: string;
    userName: string;
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    totalEstimatedHours: number;
    totalActualHours: number;
    workloadScore: number; // 0-100, higher means more workload
    efficiency: number; // actualHours / estimatedHours ratio
}

export interface TaskBottleneck {
    taskId: string;
    taskTitle: string;
    projectId: string;
    projectName: string;
    bottleneckType: 'dependency' | 'workload' | 'time' | 'resource';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    affectedTasks: string[]; // Task IDs affected by this bottleneck
    suggestedAction: string;
    detectedAt: string;
}

export interface TaskFilter {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    assignedTo?: string[];
    projectId?: string[];
    dueDateRange?: {
        start: string;
        end: string;
    };
    tags?: string[];
    searchQuery?: string;
}

export interface TaskAnalytics {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    averageCompletionTime: number; // in hours
    averageTaskDuration: number; // in hours
    productivityScore: number; // 0-100
    bottleneckCount: number;
    workloadDistribution: WorkloadMetrics[];
}
