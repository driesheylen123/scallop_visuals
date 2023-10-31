<script>
    import { scaleLinear } from 'd3-scale';
    import IntervalsForProtein from './IntervalsForProtein.svelte'
    import Details from './Details.svelte'

    let w = 800;
    let h = 400;

    let selected_datapoint = undefined;

    let columns = ['assay','sd_threshold','correct_severe_sepsis_outcome_average','severe_sepsis_outcome_average','IAF_normals','IAF_lowerbound','IAF_upperbound','abs_difference_sepsissevere_IAF','lower_for_baseline_0','upper_for_baseline_0','difference_sepsissevere_IAF', 'NS_sepsis']
    let sort_column = 'assay'

    const scaleY = scaleLinear().domain([-10,10]).range([h,0])
    $: deltaX = w / datapoints.length
    $: horizontal_grid = scaleY.ticks(7)

    export let datapoints;
    let augmented_datapoints;
    $: {
        augmented_datapoints = []
        datapoints.forEach((d) => {
            d.min_iaf = scaleY(d.lower_for_baseline_0)
            d.max_iaf = scaleY(d.upper_for_baseline_0)
            d.min_sepsis = scaleY(d.difference_sepsissevere_IAF-d.sd_threshold)
            d.max_sepsis = scaleY(d.difference_sepsissevere_IAF+d.sd_threshold)
            d.sepsis = scaleY(d.difference_sepsissevere_IAF)
            augmented_datapoints = [...augmented_datapoints, d]
        })
    }

    let sorted_datapoints;
    $: {
        sorted_datapoints = []
        augmented_datapoints.sort((a,b) => a[sort_column] < b[sort_column] ? -1 : 1).forEach((d,i) => {
            d.translate_x = i*deltaX + 5
            sorted_datapoints = [...sorted_datapoints, d]
        })
    }
</script>

<style>
    svg {
        background-color: #edecec;
        padding: 5px;
    }
    line.grid {
        stroke: white;
        stroke-width: 2;
    }
    text {
        text-anchor: middle;
        /* font-size: small; */
    }
</style>

<h1>Range transfer of reference data to contextualise disease data</h1>

<div>
    Sort by: <select bind:value={sort_column}>
        {#each columns as column}
            <option value={column}>{column}</option>
        {/each}
    </select>
</div>
<svg width={w+50} height={h+100} on:mouseleave={() => { selected_datapoint = undefined }}> <!-- 100 is for labels -->
    {#each horizontal_grid as tick}
        <line class="grid" x1=0 x2={w} y1={scaleY(tick)} y2={scaleY(tick)} />
        <text x={w+10} y={scaleY(tick)}>{tick}</text>
    {/each}
    {#each sorted_datapoints as datapoint}
        <g transform={"translate(" + datapoint.translate_x + ",0)"}>
            <IntervalsForProtein datapoint={datapoint} bind:selected_datapoint={selected_datapoint}/>
        </g>
    {/each}
    <text x={w/2} y={h+90}>Inflammation proteins</text>
    <text x={w+40} y={h/2} text-anchor="middle" dominant-baseline="central"
            transform={"rotate(90," + (w+40) + "," + (h/2) + ")"}>Difference in NPX value sepsis vs IAF</text>
</svg>

{#if selected_datapoint != undefined }
<Details datapoint={selected_datapoint} />
{/if}