# Tables
USERS
| Field      | Type      |
| ---------- | --------- |
| id         | uuid      |
| email      | text      |
| full_name  | text      |
| avatar     | text      |
| created_at | timestamp |

SUBJECTS
| Field    | Type    |
| -------- | ------- |
| id       | uuid    |
| user_id  | uuid    |
| title    | text    |
| color    | text    |
| semester | integer |

TASKS
| Field       | Type      |
| ----------- | --------- |
| id          | uuid      |
| subject_id  | uuid      |
| title       | text      |
| description | text      |
| due_date    | timestamp |
| completed   | boolean   |

NOTES
| Field      | Type |
| ---------- | ---- |
| id         | uuid |
| subject_id | uuid |
| title      | text |
| content    | text |

FILES
| Field    | Type |
| -------- | ---- |
| id       | uuid |
| user_id  | uuid |
| file_url | text |
| type     | text |

STUDY_SESSIONS
| Field    | Type    |
| -------- | ------- |
| id       | uuid    |
| user_id  | uuid    |
| duration | integer |

ANALYTICS
| Field   | Type    |
| ------- | ------- |
| id      | uuid    |
| user_id | uuid    |
| score   | integer |


