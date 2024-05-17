<template>
    <v-row justify="center" align="center">
    <v-col>
      <ScatterPlot v-if="dataChart && dataChart.inline_data.visualization.type == '2D-plot'" :dataJson="dataChart" />
      <BarPlot v-if="dataChart && dataChart.inline_data.visualization.type == 'bar-plot'" :dataJson="dataChart" />
    </v-col>
  </v-row>
</template>

<script>
import BarPlot from './BarPlot.vue';
import ScatterPlot from './ScatterPlot.vue';

export default {
    name: 'LoaderWidgets',
    components:{
      BarPlot, ScatterPlot
    },
    props: {
      dataChart: {
        type: Object,
        required: true
      }
    },
}
</script>

