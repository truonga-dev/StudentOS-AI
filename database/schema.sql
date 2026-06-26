create table users (
 id uuid primary key,
 email text unique,
 full_name text
);

create table subjects (
 id uuid primary key,
 user_id uuid references users(id),
 title text
);

create table tasks (
 id uuid primary key,
 subject_id uuid references subjects(id),
 title text
);