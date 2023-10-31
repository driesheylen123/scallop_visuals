<script>
    import { scaleLinear } from 'd3-scale';
    export let datapoint;

    const rescale = scaleLinear().domain([-10,10]).range([200,0])

    $: max_iaf = rescale(datapoint.upper_for_baseline_0)
    $: min_iaf = rescale(datapoint.lower_for_baseline_0)
    $: range_iaf = min_iaf - max_iaf
    $: max_sepsis = rescale(datapoint.difference_sepsissevere_IAF + datapoint.sd_threshold)
    $: min_sepsis = rescale(datapoint.difference_sepsissevere_IAF - datapoint.sd_threshold)
    $: range_sepsis = min_sepsis - max_sepsis
</script>

<style>
    svg {
        background-color: #f0f0f0;
        padding: 5px;
    }
    rect {
        stroke: none;
        fill-opacity: 0.2;
    }
    rect.iaf {
        fill: green;
    }
    rect.sepsis {
        fill: orange;
    }
    line {
        stroke: black;
        stroke-width: 2;
    }
    line.rect {
        stroke: white;
    }
</style>

<svg width=200 height=200>
    <rect class="iaf" x=0 y={max_iaf}
                      width=200 height={range_iaf} />
    <rect class="sepsis" x=0 y={max_sepsis}
                         width=200 height={range_sepsis} />
    <line x1=50 x2=50 y1={max_iaf} y2={min_iaf} />
    <line x1=150 x2=150 y1={max_sepsis} y2={min_sepsis} />
    <line class="rect" x1=0 x2=200 y1=100 y2=100 />
</svg>