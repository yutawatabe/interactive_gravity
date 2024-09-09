import plotly.graph_objects as go
from plotly.subplots import make_subplots

# Create a figure with a single subplot
fig = make_subplots(rows=1, cols=1)

# Add an empty scatter plot
fig.add_trace(
    go.Scatter(
        x=[],
        y=[],
        mode='markers',
        marker=dict(size=10),
        name='Countries'
    )
)

# Update layout for interactivity
fig.update_layout(
    title='Interactive Trade Model',
    xaxis=dict(range=[0, 1]),
    yaxis=dict(range=[0, 1]),
    showlegend=False,
    hovermode='closest',
    clickmode='event+select'
)

# Add buttons for adding/removing points
fig.update_layout(
    updatemenus=[
        dict(
            type="buttons",
            buttons=[
                dict(label="Add Point",
                     method="relayout",
                     args=["clickmode", "event"]),
                dict(label="Remove Point",
                     method="relayout",
                     args=["clickmode", "event+select"])
            ],
            direction="right",
            pad={"r": 10, "t": 10},
            showactive=True,
            x=0.1,
            xanchor="left",
            y=1.1,
            yanchor="top"
        ),
    ]
)

# Add JavaScript for interactivity
fig.add_annotation(
    text='''
    <script>
        var plot = document.getElementById('plot');
        plot.on('plotly_click', function(data) {
            var clickmode = data.layout.clickmode;
            var pts = data.points[0];
            var x = pts.xaxis.d2l(pts.x);
            var y = pts.yaxis.d2l(pts.y);
            if (clickmode === 'event') {
                Plotly.extendTraces(plot, {x: [[x]], y: [[y]]}, [0]);
            } else if (clickmode === 'event+select' && pts.curveNumber === 0) {
                var xIndex = pts.data.x.indexOf(pts.x);
                var yIndex = pts.data.y.indexOf(pts.y);
                Plotly.deleteTraces(plot, 0);
                var newX = pts.data.x.slice();
                var newY = pts.data.y.slice();
                newX.splice(xIndex, 1);
                newY.splice(yIndex, 1);
                Plotly.addTraces(plot, {x: newX, y: newY, mode: 'markers', marker: {size: 10}, name: 'Countries'});
            }
        });
    </script>
    ''',
    showarrow=False,
    x=0,
    y=0,
    xref='paper',
    yref='paper',
    xanchor='left',
    yanchor='bottom'
)

# Save as interactive HTML
fig.write_html('interactive_trade_model.html', include_plotlyjs=True, full_html=True)