
$(document).ready(function(){

	d3.csv('data/countries.csv',function(cError,countryData){
		countryList.init(countryData);

		d3.tsv('data/datasets.tsv',function(dataError,datasets){
		//Then set the aggregate function that'll loop through every dataset
			function build(dataset,selector){
				theData.init(dataset,selector);
				theCharts.init(selector,"percent")
			}

			//And finally, call that aggregate dataset

			datasets.forEach(function(dSet,i){
				var thisFile = dSet.file.split('.');

				if(thisFile[1]=="tsv"){
					d3.tsv('data/' + dSet.file,function(error,data){
						build(data,thisFile[0]);
					})
				} else {
					d3.csv('data/' + dSet.file,function(error,data){
						build(data,thisFile[0]);
					})
				}
			})
		})
	})

})

var margin = {
	top:30,
	bottom:25,
	left:30,
	right:100
}

//FUNGIBLE GLOBAL PLACEHOLDERS
var height;
var width;
var specs = [];
var barHeight = 20;
var continents;

var startDate = new Date(1992,1,1)
var endDate = new Date(2016,1,1)


//My Google Maps API key is AIzaSyC8-tE_uErpWhnOKx7Wqdg-eeNsqy2G60E

var theData = {
	init: function(rawData,selector){
		theData.spec(selector)
		specs[selector].data = rawData;
		data = theData.unpivot(selector);
		theData.narrow(selector);
		theData.restrictDates(selector);
		theData.percent(selector);
	},
	spec: function(selector){
		//Add some of the specs variables that we'll soon be needing.
		specs[selector] = {
			data: null,
			flatData: [],
			dates: null,
			keys: null,
			datesThatFit: null,
			key:selector
		}

	},
	unpivot: function(selector){
		//Due to how it's formatted, we'll unpivot on everything but data -- new entries for all country names, in other words
		specs[selector]['keys'] = d3.keys(specs[selector]['data'][0]).filter(function(d,i){return (d!="date" && d!="EMU")});

		//And we'll sort the keys by longitude, because that's what we do
		specs[selector]['keys'] = specs[selector].keys.sort(function(a,b){
			return d3.ascending(countryList.scale(a).long,countryList.scale(b).long)
		})

		specs[selector]['dates'] = util.selectDistinct(specs[selector]['data'],'date');

		//We go through all the data...
		specs[selector]['data'].forEach(function(dD,iD){
			dD.textDate = dD.date;
			dD.date = new Date(dD.date);
			//...and all the countries...
			specs[selector]['keys'].forEach(function(dC,iC){
				var thisValue = dD[dC];
				//...and as long as it's not empty...

				if (thisValue<0){
					thisValue=0;

					console.log(dC + " on " + dD.date + " was " + thisValue + " so we turned it to zero. It was our only hope.")
				} else if (thisValue!="" && thisValue!=" "){
					//...convert it from a string into a number...
					thisValue = util.removeCommas(thisValue);
				}
				if (thisValue==undefined){
					console.log(dC + " " + dD.textDate);
				}
				//...then push all the clean stuff into the main flat set.
				specs[selector].flatData.push({
					date:dD.date,
					textDate:dD.textDate,
					value:thisValue,
					key:dC
				})
			})
		})
	},
	narrow: function(selector){

		//Narrows the dataset down to only the dates for which we have enough data;
		var theseDates = [];
		specs[selector]['dates'].forEach(function(d,i){
			var thisCount = specs[selector].keys.length;
			var thisMax = 0;

			specs[selector]['flatData'].forEach(function(dD,iD){
				if(dD.value=="n/a"){
					dD.value="";
				}
				if(d == dD.textDate && dD.value == ""){
					thisCount = thisCount -1 ;
					//Using zero as a dummy value
					dD.value = 0;
				}
				if (d==dD.textDate){
					dD.prevvalue = thisMax;
					thisMax = thisMax + (+dD.value);
				}
			})

			theseDates.push({
				date:d,
				count:thisCount,
				percent:thisCount/specs[selector].keys.length,
				max: thisMax
			})

		})

		var minimum = specs[selector]['keys'].length/2

		var dates = [];

		theseDates.forEach(function(d,i){
			d.textDate = d.date;
			d.date = new Date(d.date);

			if (i==theseDates.length-1 || (d.count>=minimum && theseDates[i+1].count>=minimum)) {
				dates.push(d);
			}
		});

		specs[selector].dates = dates;

		var earliestAcceptableDate = d3.min(dates,function(d,i){return d.date});

		specs[selector].datesThatFit = (new Date()).getFullYear() -  earliestAcceptableDate.getFullYear();

		specs[selector]['flatData'] = specs[selector]['flatData'].filter(function(d,i){
			return d.date>=earliestAcceptableDate;
		})
	},
	restrictDates: function(selector){

		specs[selector].flatData = specs[selector].flatData.filter(function(d,i){
			return (d.date>=startDate && d.date<=endDate);
		})

		specs[selector].dates = specs[selector].dates.filter(function(d,i){
			return (d.date>=startDate && d.date<=endDate);
		})
	},
	percent: function(selector){
		yearMax = d3.scale.ordinal()
			.domain(specs[selector].dates.map(function(d,i){return d.textDate}))
			.range(specs[selector].dates.map(function(d,i){return d.max}))

		specs[selector].flatData.forEach(function(d,i){
			d.percent = ((+d.value/yearMax(d.textDate))*100);
			d.prevpercent = ((+d.prevvalue/yearMax(d.textDate))*100)
			d.value = +d.value
		})
	},
}

var countryList = {
	init: function(countryData) {
		countryList.sort(countryData);
		countryList.setScale(countryData);
	},
	scale: d3.scale.ordinal(),
	label: d3.scale.ordinal(),
	sort: function(countryData){
		//Sort the scale by longitude, though we might actually need to do that later as well
		countryData.sort(function(a,b){
			a.long = +a.Longitude;
			b.long = +b.Longitude;
			return d3.ascending(a.long,b.long)
		})
	},
	setScale: function(countryData){
		//Everything that I input should really have an ISO3. That can be assumed. Today, it'll be manual. Perhaps in the future it'll be fancier.
		countryList.scale.domain(countryData.map(function(d,i){
				return d.iso3}))
			.range(countryData.map(function(d,i){return d}))

		countryList.label.domain(countryData.map(function(d,i){
				return d.iso3}))
			.range(countryData.map(function(d,i){return d.country + " " + d.long.toFixed(2)}))

		continents = util.selectDistinct(countryData,'continent').filter(function(f){return f!="" && f!='Antarctica'})

	}
}

var theCharts = {
	init: function(selector,xType){
		theCharts.dom(selector)
		theCharts.size(selector)
		theCharts.scale(selector)
		theCharts.axis(selector,xType)
		theCharts.percentage(selector)
		theCharts.path(selector,xType)
		theCharts.continents(selector)
		theCharts.key(selector)

	},
	dom: function(selector){
		var div = d3.select('div#charts')
			.append('div')
			.attr('id',selector)
			.attr('class','chart');

		div.append('h4')
			.text(selector);

		var canvas = div.append('svg')
			.append('g')
			.attr('class','canvas')
			.attr('transform','translate(' + margin.left + ',' + margin.top + ')');

		canvas.append('g')
			.attr('class','axis x');

		canvas.append('g')
			.attr('class','axis y')

		canvas.append('g')
			.attr('class','percentage')

		canvas.append('g')
			.attr('class','continents')

		var viz = canvas.append('g')
			.attr('class','viz')

		canvas.append('text')
			.attr('class','tooltip')


	},
	size: function(selector){
		width = $('div#' + selector).width();

		height = specs[selector].datesThatFit * barHeight;
		width = width - margin.right - margin.left;
		height = height - margin.top - margin.bottom;

		d3.select('div#' + selector + ' svg')
			.attr('width',width + margin.right + margin.left)
			.attr('height',height + margin.top + margin.bottom)

		d3.select('div#' + selector + ' text.tooltip')
			.attr('y',0)
			.attr('x',width/2)

		d3.select('div#' + selector + ' g.percentage')
			.attr('transform','translate('+ width + ',0)');

	},
	scale: function(selector){
		specs[selector].valueX=d3.scale.linear()
			.domain([0,d3.max(specs[selector].dates,function(d,i){return d.max})])
			.range([0,width])

		specs[selector].percentX = d3.scale.linear()
			.domain([0,100])
			.range([0,width])

		specs[selector].y = d3.time.scale()
			.domain(d3.extent(specs[selector].dates,function(d,i){return d.date}))
			.range([0,height])

	},
	axis: function(selector,xType){

		var xAxis = d3.svg.axis()
			.scale(specs[selector][xType + "X"])
			.orient('bottom')
			.tickFormat(function(d,i){
				return d + "%"
			});
		var yAxis = d3.svg.axis()
			.scale(specs[selector].y)
			.orient('left')
			.ticks((new Date().getFullYear()) - startDate.getFullYear());

		d3.select('div#' + selector + " g.canvas g.axis.x")
			.call(xAxis)
			.attr('transform','translate(0,'+ height +')');

		d3.select('div#' + selector + " g.canvas g.axis.y")
			.call(yAxis);
	},
	percentage: function(selector){

		var thisData = specs[selector].dates;

		var percentage = d3.select('div#' + selector + ' g.percentage');

		var rects = percentage.selectAll('rect')
			.data(thisData);

		rects.enter()
			.append('rect')

		rects.attr('x',0)
			.attr('y',function(d,i){return specs[selector].y(d.date)})
			.attr('width',function(d,i){
				return margin.right * d.percent
			})
			.attr('height',barHeight * 0.2)
			.attr('rx',barHeight * 0.1)
			.attr('ry',barHeight * 0.1)


		var text = percentage.selectAll('text')
			.data(thisData);

		rects.enter()
			.append('text')

		rects.text(function(d){return (d.percent*100).toFixed(1) + "%"})
			.attr('x',function(d,i){return (margin.right * d.percent)})
			.attr('y',function(d,i){return specs[selector].y(d.date) + (barHeight/3)})
			.attr('dy','0.4em');
	},
	viz: function(selector,xType){
		var viz = d3.select('div#' + selector + ' g.canvas g.viz');
		var scaleX = specs[selector][xType + 'X'];

		var rects = viz.selectAll('rect')
			.data(specs[selector].flatData);

		rects.enter()
			.append('rect')

		rects.exit()
			.remove('rect')

		rects.attr('class',function(d,i){
				return specs[selector].threeLetterScale(d.key).continent.replace(/\s+/g,'')
			})
			.attr('y',function(d,i){return specs[selector].y(d.date)})
			.attr('x',function(d,i){
				return scaleX(d['prev' + xType])
			})
			.attr('width',function(d,i){
				thisWidth = specs[selector][xType + 'X'](d[xType]);
				// if(thisWidth<0){console.log(d)}
				return thisWidth})
			.attr('height',barHeight)
			.append('title')
			.text(function(d){return d.key});

	},
	path: function(selector,xType){
		var viz = d3.select('div#' + selector + ' g.canvas g.viz');
		var scaleX = specs[selector][xType + 'X'];


		var stacker = d3.layout.stack()
			.offset('wiggle');

		var layers = (specs[selector].keys).map(function(d){
			var item = [];
			specs[selector].flatData.forEach(function(dD,dI){

				var thisy = specs[selector].y(dD.date);
				var thisx0 = scaleX(dD['prev' + xType]);
				var thisx1 = thisx0 + scaleX(dD[xType]);

				if(dD.key == d){
					item.push({
						y:thisy,
						x0:thisx0,
						x1:thisx1,
						key:dD.key
					})
				} else {
					// console.log(d)
				}
			})

			return item;


		})

		var paths = viz.selectAll('path')
			.data(stacker(layers));

		paths.enter()
			.append('path')

		paths.exit()
			.remove('path')

		paths.on('mouseover',function(d,i){
			var thisFlag = d3.select(this).attr('flag');
			d3.select('div#' + selector + ' text.tooltip').text(thisFlag)
		})

		var generator = d3.svg.area()
			.y(function(d){
				return (d.y)})
			.x0(function(d){return (d.x0)})
			.x1(function(d){return (d.x1)})
			.interpolate('linear');

		paths.attr('class',function(d,i){
			var thisContinent = countryList.scale(d[0].key).continent;
			var thisKey = thisContinent.replace(/\s+/g,'');
			return thisKey
			})
			.attr('flag',function(d){
				return countryList.label(d[0].key)})
			.attr('d',function(d,i){return generator(d)});
	},
	continents: function(selector){
		theseContinents = [];
		var firstDate = d3.min(specs[selector].flatData,function(d){
			return d.date});
		continents.forEach(function(d,i){
			theseContinents.push({
				continent:d,
				continentClass:d.replace(/\s+/g,'').toLowerCase()
			})
		})
		theseContinents.forEach(function(dC,iC){
			var thisData = specs[selector].flatData.filter(function(d,i){
				var thisContinent = countryList.scale(d.key).continent;

				return dC.continent == thisContinent
			});
			var thisMin = d3.mean(thisData,function(d,i){return d.prevpercent + (d.percent/2)})
			dC.minimum = thisMin,
			dC.minX = specs[selector].percentX(thisMin)
		})

		specs[selector].continents = theseContinents
	},
	key: function(selector){
		var continents = d3.select('div#' + selector + " .canvas .continents")
			.selectAll('text')
			.data(specs[selector].continents);

		continents.enter()
			.append('text');

		continents.attr('class',function(d){return d.continentClass})
			.attr('y',0)
			.attr('x',function(d){return d.minX})
			.text(function(d){return d.continent});
	}
}
