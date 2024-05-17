<template>
  <v-container>
    <v-row>
      <v-col cols="8">
        <div class="butns">
          <!-- Buttons -->
          <v-row>
            <v-col>
              <!-- Button Sort -->
              <v-btn outlined color="secondary">
                Sort & Classify Data
              </v-btn>

            </v-col>
            <v-col>
              <!-- Button Optimal -->
              <v-btn outlined color="secondary">
                Optimal View
              </v-btn>

            </v-col>
            <v-col>
              <!-- Button Download -->
              <v-menu offset-y>
                <template v-slot:activator="{ on, attrs }">
                  <v-btn outlined color="secondary" v-bind="attrs" v-on="on">
                    Download
                  </v-btn>
                </template>
                <v-list>
                  <v-list-item>
                    <v-list-item-title>Select a format</v-list-item-title>
                  </v-list-item>
                  <v-divider></v-divider>
                  <v-list-item>PNG</v-list-item>
                  <v-list-item>SVG (only plot)</v-list-item>
                  <v-divider></v-divider>
                  <v-list-item>PDF</v-list-item>
                </v-list>
              </v-menu>
            </v-col>
          </v-row>
        </div>
      </v-col>
    </v-row>

    <v-row class="mt-4">
      <!-- Chart -->
      <v-col cols="8" id="chartCapture">
        <div ref="chart" id="barPlot"></div>
        <br>
        <!-- ID AND DATE TABLE -->
        <v-simple-table class="tableid">
          <thead>
            <tr>
              <th>Dataset ID</th>
              <th>Last Update</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>id</td>
              <td>date</td>
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
  data () {
    return {
      loading: false,
      dataset: null,
      datasetId: null,
      datasetDate: null,
      datasetPolarity: null,
      formattedDate: null,
      originalData: null,
      layout: null
    };
  },
  mounted() {
    this.renderChart();
  },
  methods: {
    async renderChart() {
     this.loading= true
      // Fetch dataset values
      const data = this.dataJson.inline_data
      this.datasetId = await this.dataJson._id
   
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

  }
};

</script>

<style scoped>
/* Estilos específicos del componente */
</style>
