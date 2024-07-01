<template>
  <v-container fluid>
    <v-row>
      <v-col cols="8">
        <div class="butns">
          <!-- Buttons -->

          <v-btn-toggle class="custom-btn-toggle">
            <v-btn @click="toggleSortOrder" class="button-classification custom-height-button"
              v-if="sortOrder === 'raw'" :disabled="loading">
              Sort & Classify Data
            </v-btn>
            <v-btn class="button-classification custom-height-button" v-else :disabled="loading"
              @click="toggleSortOrder">Return To Raw Results</v-btn>
            <v-btn @click="optimalView" class="button-resetView custom-height-button" v-if="optimal === 'no'"
              :disabled="loading">
              Optimal View
            </v-btn>
            <v-btn class="button-resetView custom-height-button" v-else :disabled="loading" @click="optimalView">Reset
              view</v-btn>
            <!-- Dropdown for Download -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }" >
                <v-btn  outlined v-bind="attrs" v-on="on"
                  class="button-download custom-height-button" :disabled="loading">
                  Download
                </v-btn>
              </template>
              <v-list>
                <v-list-item @click="downloadChart('svg', datasetId)" class="menu-item">
                  <v-list-item-title>SVG (only plot)</v-list-item-title>
                </v-list-item>
                <v-list-item @click="downloadChart('png', datasetId)" class="menu-item">
                  <v-list-item-title>PNG</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item @click="downloadChart('pdf', datasetId)" class="menu-item">
                  <v-list-item-title>PDF</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <!-- End of Dropdown for Download -->
          </v-btn-toggle>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4" id="todownload">
      <!-- Chart -->
      <v-col cols="8" id="chartCapture">
        <div ref="chart" id="barPlot"></div>
        <br>
        <!-- ID AND DATE TABLE -->
        <div class="info-table">
          <v-simple-table class="custom-table" v-if="datasetModDate">
          <tbody>
            <tr>
              <th class="first-th">Dataset ID</th>
              <td>{{ datasetId }}</td>
              <th>Last Update</th>
              <td class="last-td">{{ formatDateString(datasetModDate) }}</td>
            </tr>
          </tbody>
          </v-simple-table>
        </div>
      </v-col>

      <!-- Quartile Table -->
      <v-col cols="4" id="quartileCapture" v-if="sortOrder === 'sorted' && Object.keys(quartileData).length > 1">
        <v-simple-table class="tools-table" height="800px" fixed-header
          :class="{ 'fade-in': sortOrder === 'sorted', 'fade-out': sortOrder === 'raw' }" id='quartileTable'>

          <thead>
            <tr>
              <th class="tools-th">Participants</th>
              <th class="classify-th">Quartile
                <v-tooltip bottom>
                  <template v-slot:activator="{ on, attrs }">
                    <i class="material-icons custom-alert-icon" v-bind="attrs" v-on="on">
                      info
                    </i>
                  </template>
                  <div class="quartile-message">
                    <p><b>The Square quartile label</b></p>
                    <p>By default, the highest values will be displayed in the first quartile.
                      Inversely if it is specified.</p>
                  </div>
                </v-tooltip>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(quartile, index) in quartileDataArray" :key="index">
              <td>{{ quartile.tool }}</td>
              <td :style="{ backgroundColor: quartile.quartile.bgColor }">{{ quartile.quartile.quartile }}
              </td>
            </tr>
          </tbody>
        </v-simple-table>
      </v-col>
    </v-row>
  </v-container>
</template>
<script>
// Importación de Plotly
import Plotly from 'plotly.js-dist';
import 'jspdf-autotable';

// REQUIREMENTS
const html2canvas = require('html2canvas');
const { jsPDF } = require('jspdf');

const imgLogo = 'data:image/png;base64,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';

export default {
  name: 'BarPlot',
  props: {
    dataJson: {
      type: Object,
      required: true
    }
  },
  data() {
    return {
      loading: false,
      datasetId: null,
      datasetModDate: null,
      datasetPolarity: null,
      formattedDate: null,
      originalData: null,
      layout: null,
      sortOrder: 'raw',
      optimal: 'no',
      showAdditionalTable: false,
      quartileData: {},
      showAdditionalTable: false,
      icon: 'info',

    };
  },
  mounted() {
    this.renderChart();
  },
  computed: {
    quartileDataArray() {
      // Convert quartileData object into an array of objects
      const array = Object.entries(this.quartileData).map(([tool, quartile]) => ({ tool, quartile }));
      // Sort the array alphabetically
      return array.sort((a, b) => a.tool.localeCompare(b.tool));
    }
  },
  methods: {

    // ----------------------------------------------------------------
    // MAKE CHART
    // ----------------------------------------------------------------
    async renderChart() {
      this.loading = true
      // Fetch dataset values
      const data = this.dataJson.inline_data
      this.datasetId = await this.dataJson._id
      this.datasetModDate = this.dataJson.dates.modification

      // Save original data for future use
      this.originalData = data;

      // Calculate maximum value for y-axis range
      const maxMetricValue = Math.max(...data.challenge_participants.map(entry => entry.metric_value));

      const x = data.challenge_participants.map(entry => entry.tool_id);
      const y = data.challenge_participants.map(() => 0);
      const colors = Array(x.length).fill('#0b579f'); // Initial colors

      const initialTrace = {
        x,
        y,
        type: 'bar',
        marker: {
          color: colors
        }
      };

      this.layout = {
        title: '',
        autosize: true,
        height: 800,
        xaxis: {
          title: {
            text: 'participants',
            standoff: 30,
            font: {
              family: 'Arial, sans-serif',
              size: 18,
              color: 'black',
              weight: 'bold'
            }
          },
          fixedrange: true,
          tickangle: -45,
          tickfont: { size: 16 }
        },
        yaxis: {
          title: {
            text: data.visualization.metric,
            font: {
              family: 'Arial, sans-serif',
              size: 18,
              color: 'black',
              weight: 'bold'
            }
          },
          fixedrange: true,
          range: [0, maxMetricValue + 0.1],
          tickfont: { size: 14 }
        },
        margin: { l: 50, r: 50, t: 100, b: 110, pad: 4 },
        images: [
          {
            source: imgLogo,
            xref: "paper",
            yref: "paper",
            x: 0.95,
            y: 1.17,
            sizex: 0.1,
            sizey: 0.3,
            xanchor: "right",
            yanchor: "top",
            opacity: 0
          }
        ]
      };

      const config = {
        displayModeBar: false,
        responsive: true,
        hovermode: false
      };

      // Create the bar chart with the initial trace and layout
      Plotly.newPlot(this.$refs.chart, [initialTrace], this.layout, config);

      const myPlot = this.$refs.chart;

      // Change the color of the bars on hover
      myPlot.on('plotly_hover', (event) => {
        const pn = event.points[0].pointNumber;
        const hoverColors = Array(x.length).fill('#0b579f'); // Reset colors
        hoverColors[pn] = '#f47c21'; // Change color on hover (you can adjust the color)

        const update = { 'marker': { color: hoverColors } };
        Plotly.restyle(this.$refs.chart, update);
      });

      myPlot.on('plotly_unhover', () => {
        const unhoverColors = Array(x.length).fill('#0b579f'); // Reset colors

        const update = { 'marker': { color: unhoverColors } };
        Plotly.restyle(this.$refs.chart, update);
      });

      // Simulate fetching data with animation
      setTimeout(() => {
        const actualTrace = {
          y: data.challenge_participants.map(entry => entry.metric_value)
        };

        // Animate the transition from 0 to actual values
        Plotly.animate(this.$refs.chart, {
          data: [actualTrace],
          traces: [0],
          transition: {
            duration: 1000,
            easing: 'ease-in-out'
          }
        });
        this.loading = false;
      }, 500);

      // Set up the cursor inside the plot
      const chartContainer = this.$refs.chart;
      chartContainer.addEventListener('mouseover', (event) => {
        if (event.target.classList.contains('cursor-pointer')) {
          event.preventDefault();
          event.target.style.cursor = 'default';
        }
      });
    },
    // ----------------------------------------------------------------
    // FORMAT DATE
    // ----------------------------------------------------------------
    formatDateString(dateString) {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    },
    // ----------------------------------------------------------------
    // ANIMATIONS
    // ----------------------------------------------------------------
    animateBars(data) {
      const x = data.map(entry => entry.tool_id);
      const y = data.map(() => 0); // Start with all bars at 0

      const update = {
        x: [x],
        y: [y],
      };

      Plotly.update(this.$refs.chart, update);

      const actualTrace = {
        y: data.map(entry => entry.metric_value),
      };

      // Animate the transition from 0 to actual values
      Plotly.animate(this.$refs.chart, {
        data: [actualTrace],
        traces: [0],
        transition: {
          duration: 1000,
          easing: 'ease-in-out',
        },
      });
    },

    animateLine(shapeIndex) {
      const layout = document.getElementById('barPlot').layout;
      const shape = layout.shapes[shapeIndex];
      const yTarget = 1; // End at the top

      let y = 0; // Start from the bottom

      const animateStep = () => {
        if (y <= yTarget) {
          // Update the y-coordinate of the line shape
          shape.y1 = y;

          // Update the layout with the modified shape
          Plotly.relayout(this.$refs.chart, { shapes: layout.shapes });

          // Increment y and trigger the next animation step
          y += 0.03; // Adjust the speed as needed
          requestAnimationFrame(animateStep);
        }
      };

      // Start the animation
      animateStep();
    },

    // ----------------------------------------------------------------
    // BUTTONS
    // ----------------------------------------------------------------

    // Optimal view
    // ----------------------------------------------------------------
    optimalView() {
      try {
        if (this.optimal === 'no') {

          // Fetch current data and calculate metric range
          let data;
          if (this.sortOrder !== 'raw') {
            // If data has been sorted, use the sorted data
            data = this.originalData.challenge_participants.slice().sort((a, b) => b.metric_value - a.metric_value);
          } else {
            // Otherwise, use the original data
            data = this.originalData.challenge_participants;
          }

          const metricValues = data.map(entry => entry.metric_value);
          const minMetric = Math.min(...metricValues);
          const maxMetric = Math.max(...metricValues);

          // Calculate range between min and max metrics
          const metricRange = maxMetric - minMetric;

          // Calculate new y-axis range with a slight buffer based on metric range
          const minY = Math.max(0, minMetric - metricRange * 0.2);
          const maxY = maxMetric + metricRange * 0.08;

          // Update plot layout with new y-axis range
          Plotly.relayout(this.$refs.chart, { 'yaxis.range': [minY, maxY] });

          // Animate the bars
          this.animateBars(data);

          // Update optimal value to indicate optimal view is active
          this.optimal = 'yes';
        } else {

          let data;
          if (this.sortOrder !== 'raw') {
            // If data has been sorted, use the sorted data
            data = this.originalData.challenge_participants.slice().sort((a, b) => b.metric_value - a.metric_value);
          } else {
            // Otherwise, use the original data
            data = this.originalData.challenge_participants;
          }
          // Return to original data view by restoring the original y-axis range
          const originalLayout = {
            'yaxis.range': [0, Math.max(...data.map(entry => entry.metric_value)) + 0.1]
          };

          // Update plot layout with original y-axis range
          Plotly.relayout(this.$refs.chart, originalLayout);

          // Animate the bars after adjusting the y-axis range
          this.animateBars(data);

          // Update optimal value to indicate original view is active
          this.optimal = 'no';
        }
      } catch (error) {
        console.error('Error in optimalView:', error);
      }
    },


    // Sort and order view
    // ----------------------------------------------------------------
    toggleSortOrder() {
      try {
        if (this.sortOrder === 'raw') {
          this.showAdditionalTable = !this.showAdditionalTable;
          // Sort logic (descending order)
          const sortedData = this.originalData.challenge_participants.slice().sort((a, b) => b.metric_value - a.metric_value);

          this.updateChart(sortedData);
          // Call the animateBars function after updating the chart
          this.animateBars(sortedData);
          // Calculate quartiles and update the table data
          this.quartileData = this.calculateQuartiles(sortedData);

          // Add lines between quartile groups
          this.addLinesBetweenQuartiles();

          // Add quartile labels
          this.addQuartileLabels();

        } else {
          // Return to raw data
          this.updateChart(this.originalData.challenge_participants);
          // Call the animateBars function after updating the chart
          this.animateBars(this.originalData.challenge_participants);
          this.quartileData = {};

          // Remove lines between quartile groups
          this.removeLinesBetweenQuartiles();

          // Clear quartile labels
          this.clearQuartileLabels();
        }

        // Toggle sortOrder
        this.sortOrder = this.sortOrder === 'raw' ? 'sorted' : 'raw';
      } catch (error) {
        console.error('Error in toggleSortOrder:', error);
      }
    },

    // ----------------------------------------------------------------
    // PLOT LAYOUT
    // ----------------------------------------------------------------

    // Quartile lines
    // ----------------------------------------------------------------

    addLinesBetweenQuartiles() {

      const layout = document.getElementById('barPlot').layout;

      // Ensure layout.shapes is initialized as an array
      layout.shapes = layout.shapes || [];

      const tools = Object.keys(this.quartileData);

      // Iterate over the tools to find transitions between quartiles
      for (let i = 1; i < tools.length; i++) {
        const currentTool = this.quartileData[tools[i]];
        const previousTool = this.quartileData[tools[i - 1]];

        // If the quartile of the current tool is different from the previous tool, draw a line between them
        if (currentTool.quartile !== previousTool.quartile) {
          // Calculate the x-position for the line between the current and previous tools
          const linePosition = (i + i - 1) / 2;

          // Add a line shape to the layout with initial y-positions at the bottom
          layout.shapes.push({
            type: 'line',
            xref: 'x',
            yref: 'paper',
            x0: linePosition,
            x1: linePosition,
            y0: 0,  // Start from the bottom
            y1: 0,  // Start from the bottom
            line: {
              color: 'rgba(11, 87, 159, 0.5)',
              width: 1,
              dash: 'dashdot'
            }
          });

          // Animate the line upwards to its final position
          this.animateLine(layout.shapes.length - 1);
        }
      }

      // Update the layout with the new shapes
      Plotly.relayout(this.$refs.chart, { shapes: layout.shapes });
    },

    removeLinesBetweenQuartiles() {

      const layout = document.getElementById('barPlot').layout;

      // Remove existing shapes
      layout.shapes = layout.shapes.filter(shape => shape.type !== 'line');

      // Update the plotly layout
      Plotly.update(this.$refs.chart, {}, layout);
    },

    addQuartileLabels() {

      const layout = document.getElementById('barPlot').layout;

      // Ensure layout.annotations is initialized as an array
      layout.annotations = layout.annotations || [];

      const tools = Object.keys(this.quartileData);
      const quartileCounts = {}; // Object to store the count of quartiles for each quartile number
      let uniqueQuartiles = []; // Array to store quartiles with only one tool

      // Count the occurrences of each quartile number
      tools.forEach(tool => {
        const quartile = this.quartileData[tool].quartile;
        quartileCounts[quartile] = (quartileCounts[quartile] || 0) + 1;
      });

      // Identify quartiles with only one tool
      uniqueQuartiles = Object.keys(quartileCounts).filter(quartile => quartileCounts[quartile] === 1);

      // Set to keep track of added label positions
      const addedLabelPositions = new Set();

      // Iterate over the tools to add quartile labels
      tools.forEach(tool => {
        const quartile = this.quartileData[tool].quartile;

        // Calculate the label position based on quartile count
        let labelPosition;
        if (quartileCounts[quartile] === 1) {
          // If quartile occurs only once, place the label above the tool
          labelPosition = tools.indexOf(tool);
        } else {
          // If quartile occurs multiple times, calculate the midpoint between tools with the same quartile
          const positions = tools.reduce((acc, curr, index) => {
            if (this.quartileData[curr].quartile === quartile) {
              acc.push(index);
            }
            return acc;
          }, []);

          const sum = positions.reduce((sum, pos) => sum + pos, 0);
          labelPosition = sum / positions.length;
        }

        // Add label only if it hasn't been added at this position
        if (!addedLabelPositions.has(labelPosition)) {
          // Add a label annotation to the layout
          layout.annotations.push({
            x: labelPosition,
            y: 1.03, // Top of the chart
            xref: 'x',
            yref: 'paper',
            text: `Q${quartile}`,
            showarrow: false,
            font: {
              size: 16,
              color: 'rgba(11, 87, 159, 0.5)'
            }
          });

          // Add the label position to the set of added positions
          addedLabelPositions.add(labelPosition);
        }
      });

      // Update the layout with the new annotations
      Plotly.relayout(this.$refs.chart, { annotations: layout.annotations });
    },

    clearQuartileLabels() {

      const layout = document.getElementById('barPlot').layout;

      // Ensure layout.annotations is initialized as an array
      layout.annotations = [];

      // Update the layout with the cleared annotations
      Plotly.relayout(this.$refs.chart, { annotations: layout.annotations });
    },

    updateChart(data) {

      const x = data.map(entry => entry.tool_id);
      const y = data.map(entry => entry.metric_value);

      const update = {
        x: [x],
        y: [y],
      };

      Plotly.update(this.$refs.chart, update);
    },

    // ----------------------------------------------------------------
    // CALCULATE QUARTILES
    // ----------------------------------------------------------------


    // Function to calculate medians in odd or even arrays.
    // ----------------------------------------------------------------

    calculateMedians(inputArray) {
      const sortedArray = [...inputArray].sort((a, b) => a - b);

      // Median number
      const middleIndex = Math.floor(sortedArray.length / 2);

      if (inputArray.length % 2 === 0) {
        // Even length
        const middleValues = [sortedArray[middleIndex - 1], sortedArray[middleIndex]];
        return (middleValues[0] + middleValues[1]) / 2;
      } else {
        // Odd length
        return sortedArray[middleIndex];
      }
    },

    calculateQuartiles(data) {
      const sortedValues = data.map(entry => entry.metric_value).sort((a, b) => a - b);
      const middleIndex = Math.floor(data.length / 2);

      let q1, q2, q3;
      // Calculate Q2
      if (sortedValues.length % 2 === 0) {
        // Even length
        q2 = (sortedValues[middleIndex - 1] + sortedValues[middleIndex]) / 2;
      } else {
        // Odd length
        q2 = sortedValues[middleIndex];
      }

      const lowerArray = sortedValues.filter(value => value < q2);
      const upperArray = sortedValues.filter(value => value > q2);

      // Calculate median for lowerArray and upperArray
      q1 = this.calculateMedians(lowerArray);
      q3 = this.calculateMedians(upperArray);

      // Create an object to store metric positions
      const metricPositions = {};

      // Assign positions to metrics based on quartiles with the polarity of the dataset


      data.forEach(entry => {
        const metricValue = entry.metric_value;

        if (this.datasetPolarity === "minimum") {
          if (metricValue <= q1) {
            metricPositions[entry.tool_id] = { quartile: 1, bgColor: 'rgb(237, 248, 233)' };
          } else if (metricValue > q1 && metricValue <= q2) {
            metricPositions[entry.tool_id] = { quartile: 2, bgColor: 'rgb(186, 228, 179)' };
          } else if (metricValue > q2 && metricValue < q3) {
            metricPositions[entry.tool_id] = { quartile: 3, bgColor: 'rgb(116, 196, 118)' };
          } else if (metricValue >= q3) {
            metricPositions[entry.tool_id] = { quartile: 4, bgColor: 'rgb(35, 139, 69)' };
          }
        } else {
          if (metricValue <= q1) {
            metricPositions[entry.tool_id] = { quartile: 4, bgColor: 'rgb(35, 139, 69)' };
          } else if (metricValue > q1 && metricValue <= q2) {
            metricPositions[entry.tool_id] = { quartile: 3, bgColor: 'rgb(116, 196, 118)' };
          } else if (metricValue > q2 && metricValue < q3) {
            metricPositions[entry.tool_id] = { quartile: 2, bgColor: 'rgb(186, 228, 179)' };
          } else if (metricValue >= q3) {
            metricPositions[entry.tool_id] = { quartile: 1, bgColor: 'rgb(237, 248, 233)' };
          }
        }


      });

      return metricPositions;
    },

    // ----------------------------------------------------------------
    // DOWNLOAD CHART
    // ----------------------------------------------------------------

    async downloadChart(format) {
      console.log('Downloading chart as', format);
      try {
        if (format === 'pdf') {
          const pdf = new jsPDF();
          this.layout.images[0].opacity = 0.5;
          Plotly.relayout(this.$refs.chart, this.layout);

          pdf.setFontSize(12);
          pdf.setFont(undefined, 'bold');
          pdf.text(`Benchmarking Results of ${this.datasetId} at ${this.formatDateString(this.datasetModDate)}`, 105, 10, null, null, 'center');

          // Get chart image as base64 data URI
          const chartImageURI = await Plotly.toImage(document.getElementById('barPlot'), { format: 'png', width: 750, height: 600 });

          pdf.addImage(chartImageURI, 'PNG', 10, 20);

          if (this.showAdditionalTable) {
            const columns = ["Participants", "Quartile"]; // Define your columns

            // Extract data from quartileDataArray
            const rows = this.quartileDataArray.map(q => [q.tool, q.quartile.quartile]);

            // Generate autoTable with custom styles
            pdf.autoTable({
              head: [columns],
              body: rows,
              startY: 190,
              theme: 'grid',
              tableWidth: 'auto',
              styles: {
                cellPadding: 1,
                fontSize: 8,
                overflow: 'linebreak',
                halign: 'center'
              },
              headStyles: {
                fillColor: [108, 117, 125]
              },
              willDrawCell: function (data) {

                if (data.row.section === 'body') {
                  // Check if the column header matches 'Quartile'
                  if (data.column.dataKey === 1) {
                    // Access the raw value of the cell
                    const quartileValue = data.cell.raw;
                    if (quartileValue === 1) {
                      pdf.setFillColor(237, 248, 233)
                    } else if (quartileValue === 2) {
                      pdf.setFillColor(186, 228, 179)
                    } else if (quartileValue === 3) {
                      pdf.setFillColor(116, 196, 118)
                    } else if (quartileValue === 4) {
                      pdf.setFillColor(35, 139, 69)
                    }
                  }

                }
              },
            });
            // Save the PDF
            pdf.save(`benchmarking_chart__quartiles_${this.datasetId}.${format}`);
            this.layout.images[0].opacity = 0;
            Plotly.relayout(this.$refs.chart, this.layout);
          } else {
            // Save the PDF
            pdf.save(`benchmarking_chart_${this.datasetId}.${format}`);
            this.layout.images[0].opacity = 0;
            Plotly.relayout(this.$refs.chart, this.layout);
          }


        } else if (format === 'svg') {

          this.layout.images[0].opacity = 0.5;
          Plotly.relayout(this.$refs.chart, this.layout);
          const graphDiv = document.getElementById('barPlot')
          Plotly.downloadImage(graphDiv, { format: 'svg', width: 800, height: 600, filename: `benchmarking_chart_${this.datasetId}` });
          this.layout.images[0].opacity = 0;
          Plotly.relayout(this.$refs.chart, this.layout);

        } else {

          this.layout.images[0].opacity = 0.5;
          Plotly.relayout(this.$refs.chart, this.layout);

          const toDownloadChart = document.getElementById('chartCapture');
          const downloadChart = await html2canvas(toDownloadChart, {
            scrollX: 0,
            scrollY: 0,
            width: toDownloadChart.offsetWidth,
            height: toDownloadChart.offsetHeight,
          });

          if (this.showAdditionalTable) {
            const element = document.getElementById('quartileCapture');
            const table = document.getElementById('quartileTable');

            const innerDiv = table.querySelector('div[style*="height"]');
            const originalHeight = innerDiv.style.height;


            // Remove the height style
            innerDiv.style.height = '';
            element.style.opcity = 1
            table.style.opacity = 1

            const downloadTable = await html2canvas(table, {
              scrollX: 0,
              scrollY: 0,
              width: table.offsetWidth,
              height: table.offsetHeight,
            });

            // Restore the height style
            innerDiv.style.height = originalHeight;

            const chartDownloadImage = downloadChart.toDataURL(`image/${format}`);
            const tableDownloadImage = downloadTable.toDataURL(`image/${format}`);
            const chartLink = document.createElement('a');
            const tableLink = document.createElement('a');
            chartLink.href = chartDownloadImage;
            tableLink.href = tableDownloadImage;
            chartLink.download = `benchmarking_chart__quartiles_chart_${this.datasetId}.${format}`;
            tableLink.download = `benchmarking_chart__quartiles_table_${this.datasetId}.${format}`;

            // Append links to the document
            document.body.appendChild(chartLink);
            document.body.appendChild(tableLink);

            // Trigger the download
            chartLink.click();
            tableLink.click();

            // Remove links from the document
            document.body.removeChild(chartLink);
            document.body.removeChild(tableLink);

          } else {
            const chartDownloadImage = downloadChart.toDataURL(`image/${format}`);
            const chartLink = document.createElement('a');
            chartLink.href = chartDownloadImage;
            chartLink.download = `benchmarking_chart_${this.datasetId}.${format}`;
            document.body.appendChild(chartLink);
            chartLink.click();
            document.body.removeChild(chartLink);
          }

          this.layout.images[0].opacity = 0;
          Plotly.relayout(this.$refs.chart, this.layout);
        }

      } catch (error) {
        console.error('Error downloading chart:', error);
      }
    }

  }



};

</script>

<style scoped>
.butns {
  margin-bottom: 1.5rem;
}

.custom-height-button {
  color: black;
  height: 45px !important;
  min-height: 40px !important;
  line-height: 45px !important;
}

.theme--light.v-btn-toggle:not(.v-btn-toggle--group) .v-btn.v-btn {
  border-color: #6C757D !important;
  border-width: 2px !important;
}

.button-classification {
  width: 210px;
  font-size: 16px !important;
  text-transform: capitalize;
}

.button-resetView {
  width: 140px;
  font-size: 16px !important;
  text-transform: capitalize;
}

.button-download {
  width: 168px;
  font-size: 16px !important;
  text-transform: capitalize;
}

@media (max-width: 1200px) {
  .button-classification {
    width: 180px;
    font-size: 14px !important;
  }

  .button-resetView {
    width: 120px;
    font-size: 14px !important;
  }

  .button-download {
    width: 140px;
    font-size: 14px !important;
  }

  .custom-height-button {
    height: 35px !important;
    line-height: 35px !important;
  }
}

@media (max-width: 992px) {
  .button-classification {
    width: 150px;
    font-size: 12px !important;
  }

  .button-resetView {
    width: 100px;
    font-size: 12px !important;
  }

  .button-download {
    width: 120px;
    font-size: 12px !important;
  }

  .custom-height-button {
    height: 30px !important;
    line-height: 30px !important;
  }
}

@media (max-width: 768px) {
  .button-classification {
    width: 120px;
    font-size: 10px !important;
  }

  .button-resetView {
    width: 80px;
    font-size: 10px !important;
  }

  .button-download {
    width: 100px;
    font-size: 10px !important;
  }

  .custom-height-button {
    height: 25px !important;
    line-height: 25px !important;
  }
}

@media (max-width: 300px) {

  .button-classification,
  .button-resetView,
  .button-download {
    width: 100%;
    font-size: 8px !important;
  }

  .custom-height-button {
    height: 20px !important;
    line-height: 20px !important;
  }
}

.menu-item:hover {
  background-color: #f0f0f0;
  cursor: pointer;
}

.custom-btn-toggle .v-btn:first-child {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.custom-btn-toggle .v-btn:last-child {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

.info-table{
  margin-right: 50px;
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th {
  background-color: #6c757d;
  color: white;
  font-size: 16px !important;

}

.custom-table td {
  border: 1px solid #e0e0e0;
  /* padding: 10px; */
  text-align: center;
  font-size: 16px !important;
}

.custom-table .first-th {
  border-top-left-radius: 10px;
  border-bottom-left-radius: 10px;
}

.custom-table .last-td {
  border-top-right-radius: 10px;
  border-bottom-right-radius: 10px;
}

/* Remove hover effect */
.custom-table tr:hover {
  background-color: inherit !important;
}

/* Quartile table */
.tools-table {
  width: 100%;
  border-collapse: collapse;
}

.tools-table th {
  background-color: #6c757d !important;
  color: white !important;
  text-align: left !important;
  font-size: 16px !important;
}

.tools-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  font-size: 16px !important;
}

.tools-table .tools-th {
  width: 60%;
  /* border-top-left-radius: 10px; */
}

.tools-table .classify-th {
  width: 40%;
  /* border-top-right-radius: 10px; */
}


@media (max-width: 768px) {
  .toolHeader {
    width: 30%;
    /* Ajusta el ancho de la columna de herramientas */
  }

  .toolColumn span {
    margin-left: 15px;
    /* Restaura el margen a su valor original */
  }
}

.custom-alert-icon {
  cursor: pointer;
  float: right;
}

.quartile-message {
  width: 200px;
}

@keyframes fadeIn {
  0% {
    opacity: 0;
  }

  100% {
    opacity: 1;
    visibility: visible;
  }
}

@keyframes fadeOut {
  0% {
    opacity: 1;
  }

  100% {
    opacity: 0;
  }
}

/* Apply animation when table enters and leaves */
.fade-in {
  animation: fadeIn 0.5s ease-in-out;
}

.fade-out {
  animation: fadeOut 0.5s ease-in-out;
}
</style>
