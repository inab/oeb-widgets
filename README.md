# OpenEBench Widgets

**oeb-widgets** is a collection of easy-to-use Vue components for benchmarking, initially designed for OpenEBench but also usable in other projects, making it a flexible tool. It includes two essential visualizers: a **Bar Plot** and a **Scatter Plot**, both capable of handling metrics and classifications. This package has been crafted with scalability in mind, allowing for seamless addition of more visualizers in future updates.

## Features

* Bar Plot: Create bar charts to compare different categories.
* Scatter Plot: Generate scatter plots to visualize relationships between variables.
* Extensible Design: Built to support additional visualizers in future versions.

## Installation

To install the package run:

```
npm i @inb/oeb_visualizations
```

## How to Usage

#### Import

```
import LoaderWidgets from '@inb/oeb-widgets/components/LoaderWidgets.vue';
```

#### Usage

```
<LoaderWidgets :data-chart="data"></LoaderWidgets>
```

Firstly, import the **LoaderWidgets** component, which receives and processes data and displays either a bar plot or a scatter plot based on the provided data.

## Bar Plot

Bar plot shows the results of a benchmarking challenge that uses one single evaluation metric in the form of a Barplot. Challenge participants are shown in the X axis, while the value of their metric is shown in the Y axis.

#### Classification

The results of this plot format can be transformed into a tabular format by sorting the participants in descending/ascending order according to their metrics and applying a quartile classification over that linear set of values. This classification splits the participants into four different groups/clusters depending on their performance. Clusters are separated in the plot with vertical lines and shown in the right table together with a green color-scale, which is easier to interpret for both experts and non-expert users.

![This is an alt text.](https://github.com/inab/oeb-widgets/blob/oeb-charts-package/static/widgetsPicture/Barplot.png)

#### Example Data Structure in Bar Plot

```json
{
  "_id": "OEBD003000002S",
  "dates": {
    "creation": "2018-04-09T00:00:00Z",
    "modification": "2020-04-05T14:00:00Z"
  },
  "dataset_contact_ids": ["Name.Lastname"],
  "inline_data": {
    "challenge_participants": [
      {
        "tool_id": "group01",
        "metric_value": 0.932
      },
      {
        "tool_id": "group02",
        "metric_value": 0.9279
      },
    ],
    "visualization": {
      "metric": "F-Measure",
      "type": "bar-plot"
    }
  }
}

```

## Scatter Plot

Scatter plot muestra los resultados de experimentos científicos de evaluación comparativa en formato de gráfico, y aplicar varios métodos de clasificación para transformarlos a formato tabular.

#### Classification methods

* Square quartiles - divide the plotting area in four squares by getting the 2nd quartile of the X and Y metrics.

![Square quartiles.](https://github.com/inab/oeb-widgets/blob/oeb-charts-package/static/widgetsPicture/scatter-square.png )

* Diagonal quartiles - divide the plotting area with diagonal lines by assigning a score to each participant based in the distance to the 'optimal performance'.

![Diagonal quartiles.](https://github.com/inab/oeb-widgets/blob/oeb-charts-package/static/widgetsPicture/scatter-diagonal.png  )

* Clustering - group the participants using the K-means clustering algorithm and sort the clusters according to the performance.
![Clustering.](https://github.com/inab/oeb-widgets/blob/oeb-charts-package/static/widgetsPicture/scatter-square.png )

#### Example Data Structure for Scatter Plot

```json
{
  "_id": "OEBD0080000U6A",
  "dates": {
    "creation": "2023-05-04T16:00:26Z",
    "modification": "2023-11-05T13:09:13Z",
    "public": null
  },
  "dataset_contact_ids": ["Name.Lastname", "Name.Lastname"],
  "inline_data": {
    "challenge_participants": [
      {
        "tool_id": "Domainoid+",
        "metric_x": 220046,
        "stderr_x": 0,
        "metric_y": 0.91590127,
        "stderr_y": 0.00081763741
      },
      {
        "tool_id": "OMA_Groups",
        "metric_x": 99657,
        "stderr_x": 0,
        "metric_y": 0.97144131,
        "stderr_y": 0.00071919219
      },
    ],
    "visualization": {
      "type": "2D-plot",
      "x_axis": "NR_ORTHOLOGS",
      "y_axis": "avg Schlicker",
      "optimization": "top-right"
    }
  }
}

```
