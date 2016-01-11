//The only reason this exists is so that you can match a bunch of country names to their three-digit codes.

var countries = [];
var shortCountries;
var tempBlob = [];
var scaleCountry = d3.scale.ordinal();

var makeBlob = {
	init: function(countries,dataset){

		makeBlob.load(dataset);
		// makeBlob.tidy(blobData);
	},
	setScale: function(countries){
			scaleCountry.domain(countries.map(function(d){return d.iso2}))
				.range(countries.map(function(d){return d}))
	},
	load: function(dataset){
		//get the keys for the dataset
		countries = d3.keys(dataset[0]).filter(function(d,i){return d!="date"});

		//Make them into an array the only way I know how.
		countries.forEach(function(d,i){
			tempBlob.push({
				country:d,
			});
		})

		//Then use a slow but steady google call to add values to each one without triggering a google overload
		tempBlob.forEach(function(d,i){
			setTimeout(function(){
				makeBlob.lookup(d)
			},2000*i);

			if(i==tempBlob.length-1){
				makeBlob.print(tempBlob)
			}
		})
	},
	tidy: function(data){
		data.forEach(function(d,i){
			d.Latitude = +d.Latitude;
			d.Longitude = +d.Longitude;
		})
	},
	lookup: function(datapoint){
		datapoint.trimCountry = datapoint.country.split(',')[0];
		var twoDigit;
		var theseDetails;
		var geocoder = new google.maps.Geocoder;
		geocoder.geocode({'address':datapoint.trimCountry},function(results,status){
			if (status === google.maps.GeocoderStatus.OK) {
				twoDigit = (results[0].address_components[0].short_name);
				theseDetails = scaleCountry(twoDigit);
				datapoint.twoDigit = twoDigit;
				datapoint.results = results;
				console.log(datapoint)

			} else {
				console.log(status)
				console.log('trouble')
			}
		})

	},
	print: function(data){
		console.log(JSON.stringify(data))
	}
}
