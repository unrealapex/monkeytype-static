import Chart from "chart.js";
import * as TestStats from "./test-stats";
import * as ThemeColors from "./theme-colors";
import * as Misc from "./misc";

export let result = new Chart($("#wpmChart"), {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "wpm",
        data: [],
        borderColor: "rgba(125, 125, 125, 1)",
        borderWidth: 2,
        yAxisID: "wpm",
        order: 2,
        radius: 2,
      },
      {
        label: "raw",
        data: [],
        borderColor: "rgba(125, 125, 125, 1)",
        borderWidth: 2,
        yAxisID: "raw",
        order: 3,
        radius: 2,
      },
      {
        label: "errors",
        data: [],
        borderColor: "rgba(255, 125, 125, 1)",
        pointBackgroundColor: "rgba(255, 125, 125, 1)",
        borderWidth: 2,
        order: 1,
        yAxisID: "error",
        maxBarThickness: 10,
        type: "scatter",
        pointStyle: "crossRot",
        radius: function (context) {
          var index = context.dataIndex;
          var value = context.dataset.data[index];
          return value <= 0 ? 0 : 3;
        },
        pointHoverRadius: function (context) {
          var index = context.dataIndex;
          var value = context.dataset.data[index];
          return value <= 0 ? 0 : 5;
        },
      },
    ],
  },
  options: {
    tooltips: {
      mode: "index",
      intersect: false,
      callbacks: {
        afterLabel: function (ti) {
          try {
            $(".wordInputAfter").remove();

            let wordsToHighlight =
              TestStats.keypressPerSecond[parseInt(ti.xLabel) - 1].words;

            let unique = [...new Set(wordsToHighlight)];
            unique.forEach((wordIndex) => {
              let wordEl = $($("#resultWordsHistory .words .word")[wordIndex]);
              let input = wordEl.attr("input");
              if (input != undefined)
                wordEl.append(`<div class="wordInputAfter">${input}</div>`);
            });
          } catch {}
        },
      },
    },
    legend: {
      display: false,
      labels: {},
    },
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      xAxes: [
        {
          ticks: {
            autoSkip: true,
            autoSkipPadding: 40,
          },
          display: true,
          scaleLabel: {
            display: false,
            labelString: "Seconds",
          },
        },
      ],
      yAxes: [
        {
          id: "wpm",
          display: true,
          scaleLabel: {
            display: true,
            labelString: "Words per Minute",
          },
          ticks: {
            beginAtZero: true,
            min: 0,
            autoSkip: true,
            autoSkipPadding: 40,
          },
          gridLines: {
            display: true,
          },
        },
        {
          id: "raw",
          display: false,
          scaleLabel: {
            display: true,
            labelString: "Raw Words per Minute",
          },
          ticks: {
            beginAtZero: true,
            min: 0,
            autoSkip: true,
            autoSkipPadding: 40,
          },
          gridLines: {
            display: false,
          },
        },
        {
          id: "error",
          display: true,
          position: "right",
          scaleLabel: {
            display: true,
            labelString: "Errors",
          },
          ticks: {
            precision: 0,
            beginAtZero: true,
            autoSkip: true,
            autoSkipPadding: 40,
          },
          gridLines: {
            display: false,
          },
        },
      ],
    },
    annotation: {
      annotations: [],
    },
  },
});

export function updateColors(chart) {
  if (ThemeColors.main == "") {
    ThemeColors.update();
  }
  chart.data.datasets[0].borderColor = ThemeColors.main;
  chart.data.datasets[1].borderColor = ThemeColors.sub;

  if (chart.data.datasets[0].type === undefined) {
    if (chart.config.type === "line") {
      chart.data.datasets[0].pointBackgroundColor = ThemeColors.main;
    } else if (chart.config.type === "bar") {
      chart.data.datasets[0].backgroundColor = ThemeColors.main;
    }
  } else if (chart.data.datasets[0].type === "bar") {
    chart.data.datasets[0].backgroundColor = ThemeColors.main;
  } else if (chart.data.datasets[0].type === "line") {
    chart.data.datasets[0].pointBackgroundColor = ThemeColors.main;
  }

  if (chart.data.datasets[1].type === undefined) {
    if (chart.config.type === "line") {
      chart.data.datasets[1].pointBackgroundColor = ThemeColors.sub;
    } else if (chart.config.type === "bar") {
      chart.data.datasets[1].backgroundColor = ThemeColors.sub;
    }
  } else if (chart.data.datasets[1].type === "bar") {
    chart.data.datasets[1].backgroundColor = ThemeColors.sub;
  } else if (chart.data.datasets[1].type === "line") {
    chart.data.datasets[1].pointBackgroundColor = ThemeColors.sub;
  }

  try {
    chart.options.scales.xAxes[0].ticks.minor.fontColor = ThemeColors.sub;
    chart.options.scales.xAxes[0].scaleLabel.fontColor = ThemeColors.sub;
  } catch {}

  try {
    chart.options.scales.yAxes[0].ticks.minor.fontColor = ThemeColors.sub;
    chart.options.scales.yAxes[0].scaleLabel.fontColor = ThemeColors.sub;
  } catch {}

  try {
    chart.options.scales.yAxes[1].ticks.minor.fontColor = ThemeColors.sub;
    chart.options.scales.yAxes[1].scaleLabel.fontColor = ThemeColors.sub;
  } catch {}

  try {
    chart.options.scales.yAxes[2].ticks.minor.fontColor = ThemeColors.sub;
    chart.options.scales.yAxes[2].scaleLabel.fontColor = ThemeColors.sub;
  } catch {}

  try {
    chart.data.datasets[0].trendlineLinear.style = ThemeColors.sub;
    chart.data.datasets[1].trendlineLinear.style = ThemeColors.sub;
  } catch {}

  chart.update();
}

Chart.prototype.updateColors = function () {
  updateColors(this);
};

export function setDefaultFontFamily(font) {
  Chart.defaults.global.defaultFontFamily = font.replace(/_/g, " ");
}

export function updateAllChartColors() {
  ThemeColors.update();
  result.updateColors();
}