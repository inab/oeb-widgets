<template>
    <v-container>
    <v-row>
      <v-col cols="8">
        <div class="butns">

          <!-- Buttons -->
          <v-btn-toggle class="custom-btn-toggle">
            <v-btn outlined>
              Sort & Classify Data
            </v-btn outlined>
            <v-btn>
              Optimal View
            </v-btn>
            <!-- Dropdown for Download -->
            <v-menu offset-y>
              <template v-slot:activator="{ on, attrs }">
                <v-btn outlined v-bind="attrs" v-on="on">
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
        <div ref="chart" id="scatterPlot"></div>
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
  name: 'ScatterPlot',
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
      visualizationData: null,
      formattedDate: null,
      originalData: null,
      layout: null,
      markerColors: ['#D62728', '#FF7F0E', '#8C564B', '#E377C2', '#4981B6', '#BCBD22', '#9467BD', '#0C9E7B', '#7F7F7F', '#31B8BD', '#FB8072', '#62D353'],
      colorIndex: 0,
      symbols: ['circle', 'triangle-up', 'pentagon', 'cross', 'x', 'star', 'star-diamond', 'square', 'diamond-tall'],
      currentIndex: 0,
      xValues: [],
      yValues: [],
      toolID: [],
      allToolID: [],
      dataPoints: [],
      paretoPoints: [],
      optimalXaxis: null,
      optimalYaxis: null,
      // Error messages
      showMessageError: false,
      dismissCountDown: 0,

    };
  },
  mounted() {
    // Renderizar el scatter plot cuando el componente se monta
    this.renderChart();
  },
  methods: {
    renderChart() {
      const plotData = [this.dataJson]; // Asegúrate de que los datos estén en un array

      const layout = {
        title: 'Scatter Plot',
        xaxis: {
          title: 'X Axis'
        },
        yaxis: {
          title: 'Y Axis'
        }
      };

      // Configurar el scatter plot
      Plotly.newPlot(this.$refs.chart, plotData, layout);
    }
  }
};
</script>

<style scoped>
.butns {
  position: absolute;
  top: 14px;
  margin-top: 10px;
  z-index: 1
}

.menu-item:hover {
  background-color: #f0f0f0;
  /* Change background color on hover */
  cursor: pointer;
  /* Change cursor on hover */
}

.custom-btn-toggle .v-btn:first-child {
  border-top-left-radius: 10px;
  /* Set rounded corner on top-left side of first button */
  border-bottom-left-radius: 10px;
  /* Set rounded corner on bottom-left side of first button */
}

.custom-btn-toggle .v-btn:last-child {
  border-top-right-radius: 10px;
  /* Set rounded corner on top-right side of last button */
  border-bottom-right-radius: 10px;
  /* Set rounded corner on bottom-right side of last button */
}

.custom-table {
  width: 100%;
  border-collapse: collapse;
}

.custom-table th{
background-color: lightgray;
color: white;

}

.custom-table td {
  border: 1px solid #e0e0e0;
  padding: 10px;
  text-align: center;
}

.custom-table .first-th {
  border-top-left-radius: 10px; /* Adjust the radius as needed */
  border-bottom-left-radius: 10px; /* Adjust the radius as needed */
}

.custom-table .last-td {
  border-top-right-radius: 10px; /* Adjust the radius as needed */
  border-bottom-right-radius: 10px; /* Adjust the radius as needed */
}
</style>
