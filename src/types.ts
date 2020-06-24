export interface PullRequestParams {
  [key: string]: any;
  number: number;
  html_url?: string;
  body?: string;
  base: {
    ref: string;
  };
  head: {
    ref: string;
  };
  changed_files?: number;
  addtions?: number;
  title?: string;
}

export enum StoryType {
  Feature = 'feature',
  Bug = 'bug',
  Chore = 'chore',
  Release = 'release',
}

export interface Label {
  name: string;
}

export interface Person {
  id: number;
  name: string;
}

export const enum StoryState {
  Accepted = 'accepted',
  Delivered = 'delivered',
  Finished = 'finished',
  Planned = 'planned',
  Rejected = 'rejected',
  Started = 'started',
  Unscheduled = 'unscheduled',
  Unstarted = 'unstarted',
}

export interface ReviewType {
  id: number;
  name: string;
  hidden: boolean;
}

export interface Review {
  id: number;
  review_type: ReviewType;
  reviewer_id: number;
  status: string;
}

export interface PivotalStory {
  /**
   * Title/name of the story.
   */
  name: string;
  /**
   * Type of story
   */
  story_type: StoryType;
  /**
   * In-depth explanation of the story requirements.
   */
  description?: string;
  /**
   * Point value of the story.
   */
  estimate?: number;
  /**
   * Story labels.
   */
  labels: Label[] | string[];
  owner_ids: number[];
  current_state?: StoryState;
  id: number;
  project_id: number;
  updated_at: Date;
  url: string;
}

export interface PivotalProjectResponse {
  kind: 'project';
  name: string;

  automatic_planning: boolean;
  bugs_and_chores_are_estimatable: boolean;
  created_at: string;

  // eg: '0,1,2,3'
  point_scale: string;
  point_scale_is_custom: boolean;

  current_iteration_number: number;
  description?: string;
  enable_tasks: boolean;
  id: number;
  initial_velocity: number;
  iteration_length: number;
  project_type: 'private' | 'public';
  public: boolean;
  start_date: string;
  start_time: string;
  updated_at: string;
  velocity_averaged_over: number;
  version: number;
  week_start_day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
}

export interface PivotalProjectMembership {
  id: number;
  person: Person;
}

export interface PivotalDetails {
  story: PivotalStory;
  project: PivotalProjectResponse;
  reviews: Review[];
  memberships: PivotalProjectMembership[];
}
