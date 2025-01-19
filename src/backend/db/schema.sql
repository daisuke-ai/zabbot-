-- Enable pgvector
create extension if not exists vector;

-- Create documents table
create table if not exists documents (
    id bigserial primary KEY,
    content TEXT,
    embedding vector(1536),
    source text
);

-- Create match document function
create or replace function match_documents (
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
returns table (
  id bigint,
  content text,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    documents.id,
    documents.content,
    1 - (documents.embedding <=> query_embedding) as similarity
  from documents
  where 1 - (documents.embedding <=> query_embedding) > match_threshold
  order by similarity desc
  limit match_count;
end;
$$;

-- Add function to safely add source column
create or replace function add_source_column_if_not_exists()
returns void
language plpgsql
as $$
begin
    if not exists (
        select 1
        from information_schema.columns
        where table_name = 'documents'
        and column_name = 'source'
    ) then
        alter table documents add column source text;
    end if;
end;
$$; 