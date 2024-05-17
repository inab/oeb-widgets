<template>
  <v-row justify="center" align="center">
    <v-col>
      <LoaderWidgets :data="scatterChartData"></LoaderWidgets>
    </v-col>
  </v-row>
</template>
<script>
export default {
  name: 'IndexPage',
  data() {
    return {
      fetchedData: null,
      scatterChartData: [
        {
          x: [1, 2, 3, 4, 5],
          y: [1, 2, 4, 8, 16],
          mode: 'markers',
          type: 'scatter',
          name: 'Sample Data',
          marker: { size: 12 }
        }
      ],
      barChartData: [
        {
          x: ['A', 'B', 'C', 'D'],
          y: [10, 20, 30, 40],
          type: 'bar'
        }
      ]
    }
  },
}
</script>
