-- New places a title can come from. Separate migration: enum values can't be used in the transaction that adds them.
alter type public.title_source add value if not exists 'wikidata';
alter type public.title_source add value if not exists 'musicbrainz';
