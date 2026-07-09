-- Enable pgvector extension
create extension if not exists vector;

-- Table for storing document chunks
create table if not exists public.document_chunks (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null,
    file_id uuid, -- Reference to a file in storage (optional for now, can be string URL or UUID)
    file_name text not null,
    content text not null,
    embedding vector(768), -- Gemini embeddings are usually 768 dimensions
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.document_chunks enable row level security;

create policy "Users can insert their own chunks"
on public.document_chunks for insert
with check (auth.uid() = user_id);

create policy "Users can view their own chunks"
on public.document_chunks for select
using (auth.uid() = user_id);

create policy "Users can delete their own chunks"
on public.document_chunks for delete
using (auth.uid() = user_id);

-- Function for similarity search
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid
)
returns table (
  id uuid,
  file_name text,
  content text,
  similarity float
)
language sql stable
as $$
  select
    document_chunks.id,
    document_chunks.file_name,
    document_chunks.content,
    1 - (document_chunks.embedding <=> query_embedding) as similarity
  from document_chunks
  where user_id = p_user_id
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
