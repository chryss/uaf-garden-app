export const mapWidth = 983.5;

const PLOT_SHORT = 52;
const PLOT_LONG = PLOT_SHORT * 3;
const LANDSCAPE_WIDTH = PLOT_LONG;
const LANDSCAPE_HEIGHT = PLOT_SHORT;
const PORTRAIT_WIDTH = PLOT_SHORT;
const PORTRAIT_HEIGHT = PLOT_LONG;
const VERTICAL_GAP = 18;
const DOUBLE_COLUMN_GAP = PLOT_SHORT;

const LEFT_MARGIN = 70;
const LEFT_X = LEFT_MARGIN;
const LEFT_INNER_X = LEFT_X + PORTRAIT_WIDTH + DOUBLE_COLUMN_GAP;
const MIDDLE_X = 448;
const RIGHT_LANDSCAPE_X = mapWidth - LEFT_MARGIN - LANDSCAPE_WIDTH;
const RIGHT_PORTRAIT_X = mapWidth - LEFT_MARGIN - PORTRAIT_WIDTH;

const GARDEN_TOP = 90;
const GATE_GAP_START = 250;
const GATE_GAP_END = 355;

const SECTION_1_TOP = 160;
const SECTION_1_OFFSET = 2 * (LANDSCAPE_HEIGHT + VERTICAL_GAP);
const SECTION_1_LEFT_PORTRAIT_TOP = SECTION_1_TOP + SECTION_1_OFFSET;
const SECTION_1_LEFT_LANDSCAPE_TOP =
  SECTION_1_LEFT_PORTRAIT_TOP + 4 * (PORTRAIT_HEIGHT + VERTICAL_GAP) + 24;

const range = (start, end) => Array.from({ length: end - start + 1 }, (_, index) => start + index);
const toPlotId = (plotNumber) => `plot-${String(plotNumber).padStart(3, '0')}`;
export const normalizePlotId = (plotId) => {
  const match = /^plot-(\d+)$/.exec(plotId);
  if (!match) {
    return plotId;
  }

  return toPlotId(match[1]);
};

const getPlotSize = (orientation) =>
  orientation === 'portrait'
    ? { width: PORTRAIT_WIDTH, height: PORTRAIT_HEIGHT }
    : { width: LANDSCAPE_WIDTH, height: LANDSCAPE_HEIGHT };

const getColumnBottom = (count, top, orientation) => {
  const { height } = getPlotSize(orientation);
  return top + count * height + (count - 1) * VERTICAL_GAP;
};

const plots = [];
const plotTypeOverrides = {
  'plot-118': 'needs work',
  'plot-119': 'needs work',
  'plot-120': 'needs work',
  'plot-127': 'needs work',
  'plot-128': 'needs work',
  'plot-129': 'needs work',
  'plot-132': 'needs work',
  'plot-133': 'needs work',
  'plot-136': 'needs work',
  'plot-137': 'needs work',
  'plot-139': 'needs work',
  'plot-140': 'needs work',
  'plot-121': 'special project',
  'plot-122': 'special project',
  'plot-138': 'special project',
  'plot-141': 'special project',
  'plot-142': 'special project'
};

const addColumn = (plotNumbers, x, top, orientation) => {
  const { width, height } = getPlotSize(orientation);

  plotNumbers.forEach((plotNumber, index) => {
    const plotId = toPlotId(plotNumber);
    plots.push({
      id: plotId,
      type: plotTypeOverrides[plotId] || 'regular',
      x,
      y: top + index * (height + VERTICAL_GAP),
      width,
      height
    });
  });
};

addColumn([...range(1, 25), 103], RIGHT_LANDSCAPE_X, SECTION_1_TOP, 'landscape');
addColumn(range(26, 35), MIDDLE_X, SECTION_1_LEFT_PORTRAIT_TOP, 'portrait');
addColumn(range(40, 43), LEFT_X, SECTION_1_LEFT_PORTRAIT_TOP, 'portrait');
addColumn(range(36, 39), LEFT_INNER_X, SECTION_1_LEFT_PORTRAIT_TOP, 'portrait');
addColumn(range(44, 58), LEFT_X, SECTION_1_LEFT_LANDSCAPE_TOP, 'landscape');

const section1Bottom = Math.max(
  getColumnBottom(26, SECTION_1_TOP, 'landscape'),
  getColumnBottom(10, SECTION_1_LEFT_PORTRAIT_TOP, 'portrait'),
  getColumnBottom(15, SECTION_1_LEFT_LANDSCAPE_TOP, 'landscape')
);

const COMPOST_TOP = section1Bottom + 36;
const COMPOST_WIDTH = PLOT_SHORT;
const COMPOST_HEIGHT = PLOT_SHORT * 4;
const SHED_TOP = COMPOST_TOP + COMPOST_HEIGHT + 28;
const SHED_WIDTH = 120;
const SHED_HEIGHT = 56;
const PICNIC_TABLE_WIDTH = 76;
const PICNIC_TABLE_HEIGHT = 56;
const PICNIC_TABLE_GAP = 12;
const PORTAPOTTY_SIZE = 60;

const SECTION_2_TOP = SHED_TOP + SHED_HEIGHT + 54;
const SECTION_3_TOP = 3890;
const SECTION_4_TOP = 4820;
const GARDEN_BOTTOM = 5700;

export const mapHeight = GARDEN_BOTTOM;

addColumn(range(84, 102), LEFT_X, SECTION_2_TOP, 'landscape');
addColumn([...range(77, 83), 104], MIDDLE_X, SECTION_2_TOP, 'portrait');
addColumn(range(59, 76), RIGHT_LANDSCAPE_X, SECTION_2_TOP, 'landscape');

addColumn(range(121, 129), LEFT_X, SECTION_3_TOP + LANDSCAPE_WIDTH + 24, 'landscape');
addColumn([105, 106, ...range(111, 119)], MIDDLE_X, SECTION_3_TOP, 'landscape');
addColumn([...range(107, 110), 120], RIGHT_PORTRAIT_X, SECTION_3_TOP, 'portrait');

addColumn(range(139, 142), LEFT_X, SECTION_4_TOP, 'landscape');
addColumn(range(130, 135), MIDDLE_X, SECTION_4_TOP, 'landscape');
addColumn(range(136, 138), RIGHT_PORTRAIT_X, SECTION_4_TOP, 'portrait');

export const manualPlots = plots;

export const manualPlotsById = Object.fromEntries(
  manualPlots.map((plot) => [
    plot.id,
    {
      ...plot,
      type: plotTypeOverrides[plot.id] || plot.type || 'regular',
      name: String(Number(plot.id.replace('plot-', '')))
    }
  ])
);

const section2Bottom = Math.max(
  getColumnBottom(19, SECTION_2_TOP, 'landscape'),
  getColumnBottom(8, SECTION_2_TOP, 'portrait'),
  getColumnBottom(18, SECTION_2_TOP, 'landscape')
);

const section3Bottom = Math.max(
  getColumnBottom(9, SECTION_3_TOP + LANDSCAPE_WIDTH + 24, 'landscape'),
  getColumnBottom(11, SECTION_3_TOP, 'landscape'),
  getColumnBottom(5, SECTION_3_TOP, 'portrait')
);

export const dividerLines = [
  { y: GARDEN_TOP, gateStart: GATE_GAP_START, gateEnd: GATE_GAP_END },
  { y: section2Bottom + 36, gateStart: GATE_GAP_START, gateEnd: GATE_GAP_END },
  { y: section3Bottom + 36, gateStart: GATE_GAP_START, gateEnd: GATE_GAP_END },
  { y: GARDEN_BOTTOM, gateStart: GATE_GAP_START, gateEnd: GATE_GAP_END }
];

const picnicTablesX = SHED_WIDTH + LEFT_X + 110;
const portapottyX = mapWidth - LEFT_MARGIN - PORTAPOTTY_SIZE;

export const manualLandmarks = [
  {
    id: 'compost',
    name: 'Compost',
    type: 'feature',
    x: LEFT_X,
    y: COMPOST_TOP,
    width: COMPOST_WIDTH,
    height: COMPOST_HEIGHT
  },
  {
    id: 'shed',
    name: 'Shed',
    type: 'building',
    x: LEFT_X,
    y: SHED_TOP,
    width: SHED_WIDTH,
    height: SHED_HEIGHT
  },
  {
    id: 'picnic-table-1',
    name: 'Picnic table',
    type: 'feature',
    x: picnicTablesX,
    y: SHED_TOP,
    width: PICNIC_TABLE_WIDTH,
    height: PICNIC_TABLE_HEIGHT
  },
  {
    id: 'picnic-table-2',
    name: 'Picnic table',
    type: 'feature',
    x: picnicTablesX + PICNIC_TABLE_WIDTH + PICNIC_TABLE_GAP,
    y: SHED_TOP,
    width: PICNIC_TABLE_WIDTH,
    height: PICNIC_TABLE_HEIGHT
  },
  {
    id: 'portapotty',
    name: 'Portapotty',
    type: 'feature',
    x: portapottyX,
    y: SHED_TOP - 2,
    width: PORTAPOTTY_SIZE,
    height: PORTAPOTTY_SIZE
  },
  {
    id: 'mentoring-area',
    name: 'Mentoring area',
    type: 'feature',
    x: LEFT_X,
    y: SECTION_3_TOP,
    width: LANDSCAPE_WIDTH,
    height: LANDSCAPE_WIDTH
  }
];
