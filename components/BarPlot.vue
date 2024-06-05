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
          tickfont: { size: 12 }
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
          range: [0, maxMetricValue + 0.1]
        },
        margin: { l: 50, r: 50, t: 100, b: 110, pad: 4 },
        images: [
          {
            source: "/2018.OpenEBench.logo.Manual_page2.png",
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
  /* Adjust the radius as needed */
  border-bottom-left-radius: 10px;
  /* Adjust the radius as needed */
}

.custom-table .last-td {
  border-top-right-radius: 10px;
  /* Adjust the radius as needed */
  border-bottom-right-radius: 10px;
  /* Adjust the radius as needed */
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
