const ChartjsNode = require('chartjs-node');
const { formatNumber: n } = require('./utils');

const CORE_ORANGE = 'rgba(237,163,77, 0.7)';
const CASH_GREEN = 'rgb(113, 197, 89)';

const createFlipChart = async (ratio, { width = 300, height = 350 } = {}) => {
  const cashRatioText = n(ratio, '0.00%');
  const coreRatioText = n(1 - ratio, '0.00%');

  const data = {
    labels: [`Bitcoin Cash (${cashRatioText})`, `Bitcoin Core (${coreRatioText})`],
    datasets: [
      {
        label: 'Market Cap (USD)',
        data: [ratio, 1 - ratio],
        backgroundColor: [CASH_GREEN, CORE_ORANGE],
        borderColor: ['#fff', '#fff'],
      },
    ],
  };

  const chartOptions = {
    backgroundColor: '#fff',
    chartArea: {
      backgroundColor: '#fff',
    },
    legend: {
      labels: {
        fontColor: '#000',
      },
    },
    layout: {
      padding: { left: 8, right: 8, top: 8, bottom: 16 }
    },
    title: {
      display: true,
      text: `The Cashening (${new Date().toISOString().substr(0, 10)})`,
      fontColor: '#000',
    }
  };

  const plugin = {
    beforeDraw: function (chart, easing) {
      const { helpers } = ChartjsNode;
      const { ctx } = chart.chart;

      if (chart.config.options.backgroundColor) {
        ctx.save();
        ctx.fillStyle = chart.config.options.backgroundColor;
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
      }

      if (chart.config.options.chartArea && chart.config.options.chartArea.backgroundColor) {
        var chartArea = chart.chartArea;

        ctx.save();
        ctx.fillStyle = chart.config.options.chartArea.backgroundColor;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        ctx.restore();
      }
    }
  };

  const options = {
    type: 'doughnut',
    data: data,
    options: chartOptions,
    plugins: [plugin],
  };

  const chartNode = new ChartjsNode(width, height);

  await chartNode.drawChart(options);

  const buffer = chartNode.getImageBuffer('image/png');

  chartNode.destroy();

  return buffer;
};

module.exports = createFlipChart;
