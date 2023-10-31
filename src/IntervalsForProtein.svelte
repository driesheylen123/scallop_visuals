<script>
    export let datapoint;
    export let selected_datapoint = undefined;
</script>

<style>
    line.iaf {
        stroke: green;
        stroke-width: 2;
    }
    line.sepsis {
        stroke: orange;
        stroke-width: 2;
    }
    circle.sepsis {
        fill: darkred;
        fill-opacity: 0.8;
    }
    line.grid {
        stroke: white;
        stroke-width: 2;
    }
    text {
        text-anchor: end;
        font-size: xx-small;
    }
</style>

<!-- svelte-ignore a11y-mouse-events-have-key-events -->
<g on:mouseover={() => selected_datapoint = datapoint}>
    <!-- Grid -->
    <line class="grid" x1=0 x2=0 y1=0 y2=400 />

    <!-- IAF -->
    <line class="iaf" x1=0 x2=0 y1={datapoint.min_iaf} y2={datapoint.max_iaf} />
    <line class="iaf" x1=-3 x2=3 y1={datapoint.min_iaf} y2={datapoint.min_iaf} />
    <line class="iaf" x1=-3 x2=3 y1={datapoint.max_iaf} y2={datapoint.max_iaf} />

    <!-- Sepsis -->
    <circle class="sepsis" cx=0 cy={datapoint.sepsis} r=3 />
    <line class="sepsis" x1=0 x2=0 y1={datapoint.min_sepsis} y2={datapoint.max_sepsis} />
    <line class="sepsis" x1=-3 x2=3 y1={datapoint.min_sepsis} y2={datapoint.min_sepsis} />
    <line class="sepsis" x1=-3 x2=3 y1={datapoint.max_sepsis} y2={datapoint.max_sepsis} />

    <!-- Protein name -->
    <text x=0 y=0 dominant-baseline="middle" transform="translate(0,405) rotate(-90)">{datapoint.assay}</text>
</g>