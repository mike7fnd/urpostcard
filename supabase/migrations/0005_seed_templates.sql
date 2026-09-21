-- urpostcard :: 0005 postcard designs
--
-- Reference data, not sample data. design_config is the contract the
-- PostcardSurface component renders: paper colour, ink, grain, edge treatment,
-- stamp, and an abstract front "scene" drawn in CSS/SVG rather than shipped as
-- an image, so a postcard costs nothing to load and stays sharp at any size.

insert into public.postcard_templates (slug, name, description, design_config, sort_order)
values
  (
    'plain-white',
    'Plain',
    'Heavy white card, nothing on it but the light.',
    jsonb_build_object(
      'paper', '#FBFAF7', 'ink', '#171614', 'accent', '#9A948A',
      'texture', 'smooth', 'grain', 0.18, 'edge', 'hairline',
      'rule', '#DFDBD2',
      'typography', jsonb_build_object('family', 'sans', 'tracking', '0.01em'),
      'stamp', jsonb_build_object('bg', '#EEEBE4', 'ink', '#6B665E', 'label', 'POST'),
      'scene', jsonb_build_object('type', 'horizon', 'palette',
        jsonb_build_array('#F4F2EE', '#E6E3DC', '#CFCBC2'))
    ),
    10
  ),
  (
    'vintage-paper',
    'Vintage',
    'Foxed stock from a drawer somebody forgot about.',
    jsonb_build_object(
      'paper', '#EFE4CE', 'ink', '#3A2E1F', 'accent', '#9C6F3F',
      'texture', 'pulp', 'grain', 0.42, 'edge', 'deckle',
      'rule', '#C8B48C',
      'typography', jsonb_build_object('family', 'serif', 'tracking', '0.02em'),
      'stamp', jsonb_build_object('bg', '#D9C49A', 'ink', '#5A4326', 'label', 'PAR AVION'),
      'scene', jsonb_build_object('type', 'dunes', 'palette',
        jsonb_build_array('#E8D5AE', '#CDA86F', '#9A7642', '#6E5430'))
    ),
    20
  ),
  (
    'travel-airmail',
    'Air Mail',
    'Red and blue border, flown in from somewhere far.',
    jsonb_build_object(
      'paper', '#FAF8F3', 'ink', '#1B2330', 'accent', '#B03A2E',
      'texture', 'linen', 'grain', 0.26, 'edge', 'airmail',
      'rule', '#C9CEd6',
      'typography', jsonb_build_object('family', 'sans', 'tracking', '0.06em'),
      'stamp', jsonb_build_object('bg', '#E8EDF4', 'ink', '#24486F', 'label', 'AIR MAIL'),
      'scene', jsonb_build_object('type', 'clouds', 'palette',
        jsonb_build_array('#BBD3E8', '#8FB4D4', '#5E86AE', '#F3EFE6'))
    ),
    30
  ),
  (
    'soft-pastel',
    'Pastel',
    'Chalky paper, a sky that cannot decide on a colour.',
    jsonb_build_object(
      'paper', '#FAF3F1', 'ink', '#413339', 'accent', '#C98B94',
      'texture', 'smooth', 'grain', 0.22, 'edge', 'scallop',
      'rule', '#E8D5D4',
      'typography', jsonb_build_object('family', 'sans', 'tracking', '0.02em'),
      'stamp', jsonb_build_object('bg', '#F0DEDC', 'ink', '#8C616A', 'label', 'POST'),
      'scene', jsonb_build_object('type', 'gradient-sky', 'palette',
        jsonb_build_array('#F7D9DA', '#E7CBDD', '#C9CFE8', '#F6EDE4'))
    ),
    40
  ),
  (
    'film-photograph',
    'Film',
    'A photograph printed slightly too dark, edges and all.',
    jsonb_build_object(
      'paper', '#F2F0EA', 'ink', '#1C1C1A', 'accent', '#6F7466',
      'texture', 'film', 'grain', 0.55, 'edge', 'photo-border',
      'rule', '#D3D0C7',
      'typography', jsonb_build_object('family', 'mono', 'tracking', '0.08em'),
      'stamp', jsonb_build_object('bg', '#E3E0D7', 'ink', '#4A4A44', 'label', '35MM'),
      'scene', jsonb_build_object('type', 'coast', 'palette',
        jsonb_build_array('#8C9A96', '#5C6B6B', '#39433F', '#D8D3C6'))
    ),
    50
  ),
  (
    'seasonal-winter',
    'Winter',
    'Cold paper, low sun, the short end of the year.',
    jsonb_build_object(
      'paper', '#F4F6F7', 'ink', '#232B31', 'accent', '#5C7C8A',
      'texture', 'linen', 'grain', 0.30, 'edge', 'hairline',
      'rule', '#D3DCE0',
      'typography', jsonb_build_object('family', 'serif', 'tracking', '0.02em'),
      'stamp', jsonb_build_object('bg', '#DEE7EA', 'ink', '#3E5866', 'label', 'WINTER'),
      'scene', jsonb_build_object('type', 'mountains', 'palette',
        jsonb_build_array('#DCE6EA', '#A8BCC6', '#6F8795', '#44555F'))
    ),
    60
  )
on conflict (slug) do update
set name          = excluded.name,
    description   = excluded.description,
    design_config = excluded.design_config,
    sort_order    = excluded.sort_order,
    is_active     = true;
