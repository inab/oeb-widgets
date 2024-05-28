<template>
  <v-container fluid>
    <v-row>
      <v-col cols="8">
        <div class="butns">
          <!-- Buttons -->

          <v-btn-toggle class="custom-btn-toggle">
            <v-btn outlined class="button-classification custom-height-button">
              Sort & Classify Data
            </v-btn outlined>
            <v-btn @click="optimalView" class="button-resetView custom-height-button" v-if="optimal === 'no'"
              :disabled="loading">
              Optimal View
            </v-btn>
            <v-btn  class="button-resetView custom-height-button" v-else :disabled="loading" @click="optimalView">Reset view</v-btn>
            <!-- Dropdown for Download -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on" class="button-download custom-height-button">
                  Download
                </v-btn>
              </template>
              <v-list>
                <v-list-item class="menu-item">
                  <v-list-item-title>SVG</v-list-item-title>
                </v-list-item>
                <v-list-item class="menu-item">
                  <v-list-item-title>PNG</v-list-item-title>
                </v-list-item>
                <v-divider></v-divider>
                <v-list-item class="menu-item">
                  <v-list-item-title>PDF</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
            <!-- End of Dropdown for Download -->
          </v-btn-toggle>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <!-- Chart -->
      <v-col cols="8" id="chartCapture">
        <div ref="chart" id="barPlot"></div>
        <br>
        <!-- ID AND DATE TABLE -->
        <v-simple-table class="custom-table">
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

    </v-row>
  </v-container>
</template>
<script>
// Importación de Plotly
import Plotly from 'plotly.js-dist';

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
      showAdditionalTable: false
    };
  },
  mounted() {
    this.renderChart();
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
  }


};

</script>

<style scoped>
.butns {
  margin-bottom: 1.5rem;
}

.custom-height-button {
  height: 40px !important;
  min-height: 30px !important;
  line-height: 40px !important;
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
  padding: 10px;
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
</style>
