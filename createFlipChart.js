const ChartjsNode = require('chartjs-node');
const { formatNumber: n } = require('./utils');

const createFlipChart = async ratio => {
  const cashRatioText = n(ratio, '0.00%');
  const coreRatioText = n(1 - ratio, '0.00%');

  const data = {
    labels: [`Bitcoin Cash (${cashRatioText})`, `Bitcoin Core (${coreRatioText})`],
    datasets: [
      {
        label: 'Market Cap (USD)',
        data: [ratio, 1 - ratio],
        backgroundColor: ['rgb(113, 197, 89)', 'rgb(237,163,77)'],
      },
    ],
  };

  const chartOptions = {
    chartArea: {
      backgroundColor: '#fff',
    },
  };

  const plugin = {
    beforeDraw: function (chart, easing) {
      if (chart.config.options.chartArea && chart.config.options.chartArea.backgroundColor) {
        var helpers = ChartjsNode.helpers;
        var ctx = chart.chart.ctx;
        var chartArea = chart.chartArea;

        ctx.save();
        ctx.fillStyle = chart.config.options.chartArea.backgroundColor;
        ctx.fillRect(chartArea.left, chartArea.top, chartArea.right - chartArea.left, chartArea.bottom - chartArea.top);
        ctx.restore();
      }
    }
  };

  const options = {
    type: 'pie',
    data: data,
    options: chartOptions,
    plugins: [plugin],
  };

  // 600x600 canvas size
  const chartNode = new ChartjsNode(600, 600);

  await chartNode.drawChart(options);

  const buffer = chartNode.getImageBuffer('image/png');

  chartNode.destroy();

  return buffer;
};

module.exports = createFlipChart;
