-- Update match_document_chunks to support filtering by file names
create or replace function match_document_chunks (
  query_embedding vector(768),
  match_threshold float,
  match_count int,
  p_user_id uuid,
  p_file_names text[] default null
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
    and (p_file_names is null or document_chunks.file_name = any(p_file_names))
    and 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
$$;
