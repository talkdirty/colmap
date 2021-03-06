import { Component, OnInit, ReflectiveInjector, Inject } from '@angular/core';
import { RouteParams } from '@angular/router-deprecated';
import { MaterialTemplate } from './material';

import { GeoGraphNetwork, COLConnectionInfo, 
	GraphNetworkHealth, Coords, CNode, GraphEdge,
	GraphNetworkUpdate } from './colmap/graph/graphnetwork';
import { DisplayNodeUtils, DisplaySettings } from './colmap/ui/displaynodes';
import { PerferenceService } from './colmap/state/preferences';
import { BackendService } from './colmap/network/server';

import { Observable } from 'rxjs/Observable';

import { ToolTip } from './colmap/ui/tooltip.component';
import { ServiceCards } from './colmap/ui/servicecards.component';

import * as Ol from 'openlayers';

@Component({
	selector: 'map',
	templateUrl: 'app/map.component.html',
	directives : [ToolTip, ServiceCards]
})
export class MapComponent extends MaterialTemplate implements OnInit {
	/* Databound Attributes: */
	mapid : string;
	connectedUsers : number = 0;
	connectedServices : number = 0;

	// Notification container TODO make this a service/component
	snackbarContainer: any;

	/* Things we need for OpenLayers */
	bw: number; bh: number;
	map: any;

	/* Things we need for the GraphNetwork */
	network : GeoGraphNetwork;

	lastNetworkHealth : GraphNetworkHealth = null;
	nodeFeatures = new Ol.Collection<Ol.Feature>([]);
	edgeFeatures = new Ol.Collection<Ol.Feature>([]);
	graphLayer = new Ol.layer.Vector({
		source : new Ol.source.Vector({
			features : this.nodeFeatures
		})
	});
	edgeLayer = new Ol.layer.Vector({
		source: new Ol.source.Vector({
			features: this.edgeFeatures
		}),
	});

	// Toggle button in header
	graphtoggle : boolean = false;
	layersStore : Ol.Collection<Ol.layer.Layer>;

	// Features that are highlighted via hover must be kept
	// track of somehow. pendingUndoHovers contains a list of
	// functions that undoes the change.
	pendingUndoHovers : Set<Object> = new Set<Object>();
	currentHover = undefined;

	// Input for <servicecards> component
	allServices : Map<string, Object>;

	// new chat messages
	chatMessages: number;
	chatWindow : boolean = false;

	constructor(private routeParams: RouteParams, 
		private preferences : PerferenceService,
		private backendService : BackendService){
		super();
	}


	displayNetworkUpdate(update : GraphNetworkUpdate){
		// todo refactor this function so not so much mutable state is being
		// thrown all around between map.component and displaynodes. Make Graphnetwork
		// Immutable?
		// Todo, update.additions o.ä, sollten keine GraphEdges sein, weil es keine
		// GraphEdges sind, sondern suchkriterien für GeoGraphNetwork.nodeExists, und kriterien
		// für erstellung der Edges. Stattdessen irgendeinen intermediate type benutzen!!!!!!!!
		for (let addition of update.additiveNodes){
			for (let nodeName in addition){
				if (!this.network.nodeExists(nodeName)){
					this.network.add(nodeName, addition[nodeName]);
					DisplayNodeUtils.displayNode(addition[nodeName], this.nodeFeatures);
				} else {
					// Todo once node highlighting is implemented: Do a highlight
					// here instead.
					console.log(`Ignoring insertion of Duplicate: ${nodeName}`);
				}
			}
		}

		for (let addedEdge of update.additions){
			let edge = this.network.findEdge(addedEdge);
			if (edge === null){
				edge = this.network.connector(addedEdge.from, [addedEdge.to], false);
				if (edge !== null)
					DisplayNodeUtils.displayEdgeRaw(edge, this.network, this.nodeFeatures);
			} else {
				// Todo: add a settings option that allows to turn this off.
				console.log(`Edge ${edge} exists, highlighting instead.`);
				DisplayNodeUtils.animateHighlight(edge, this.network);
			}
		}

		for (let highlightEdge of update.highlight){
			DisplayNodeUtils.animateHighlight(highlightEdge, this.network);
		}

		for (let removedEdge of update.deletions){
			// TODO UTILIZE EDGEFEATURES!!!!
			DisplayNodeUtils.deleteEdge(removedEdge, this.nodeFeatures, this.network);
		}
	}

	// TODO Observables haben hier nichts zu suchen
	buildNetworkInitial(graphNetwork : Observable<GeoGraphNetwork>){
		this.notification("buildNetworkInitial()..");

		// Wait for Observable to yield network
		graphNetwork.forEach(network => {
			this.network = network;
			let lastInsertion;

			// Iterate nodes of network and append
			network.nodeIterator((node : CNode<Coords>, _, __) => {
				lastInsertion = DisplayNodeUtils.displayNode(node, this.nodeFeatures);
				DisplayNodeUtils.displayEdges(node, network, this.nodeFeatures);
			}, () => {
				if (lastInsertion !== undefined){
					this.map.getView().setCenter(lastInsertion);
				}
			});
		});
	}


	connect(){
		let source : Observable<COLConnectionInfo> = this.backendService.connect(this.mapid);
		source.forEach(connectionInfo => {
			if (connectionInfo.connected){
				this.notification('connected to ' + this.mapid); 
			} else {
				if (connectionInfo.connected === false){
					return this.notification('connection failed');
				}
			}
			if (connectionInfo.connectedUsers){
				this.connectedUsers = connectionInfo.connectedUsers;
			}
			if (connectionInfo.connectedServices){
				this.connectedServices = connectionInfo.connectedServices;
			}
			if (connectionInfo.allServices){
				this.allServices = connectionInfo.allServices;
			}
			if (this.lastNetworkHealth === null){
				this.lastNetworkHealth = connectionInfo.networkHealth;
				this.buildNetworkInitial(this.backendService.downloadNetwork());
			}
		});

		let deltas = this.backendService.activateDelta(0);
		deltas.forEach((delta) => {
			this.displayNetworkUpdate(delta);
		});
	}

	notification(of){
		this.snackbarContainer.MaterialSnackbar.showSnackbar({
			message: of
		  , timeout: 2000
		  , actionHandler: function(event){}
		  , actionText: 'OK'
		});

	}


	// TODO remove debug function
	btnDebug(){
		document["map"] = this;
		this.notification('Exposed Component to: document.map');
	}

	btnToggled(){
		this.graphtoggle = !this.graphtoggle;
		let layers = this.map.getLayers();

		if (this.graphtoggle){
			// Deactivate Map Layers
			for (let layer of layers.getArray()){
				if (layer instanceof Ol.layer.Tile){
					layer.setOpacity(0);
				}
			}
		} else {
			// Reactivate Map Layers
			for (let layer of layers.getArray()){
				if (layer instanceof Ol.layer.Tile){
					layer.setOpacity(1);
				}
			}
		}
	}

	provider(olSource : string, apply : boolean = true) : string {
		console.log("providerchange fired");
		var layer: any;
		switch (olSource) {
			case 'ol.source.Stamen':
				layer = new Ol.layer.Tile({
					source: new Ol.source.Stamen({
						layer: 'toner'
					})
				}); break;
			case 'ol.source.OSM':
				layer = new Ol.layer.Tile({
					source: new Ol.source.OSM()
				}); break;
			case 'ol.source.BingMaps':
				layer = new Ol.layer.Tile({
					source: new Ol.source.BingMaps({
						key: 'AnOpGK0vuwH0a2tPUKih1RPmu6REVRH7SqP8jhSNFKeDORF7cCXGkhxY1wzbF7ul'
						// TODO leverage usage of this
					  , imagerySet: 'AerialWithLabels'
					})
				}); break;
		}
		if (apply) {
			console.log("apply fired");
			this.map.getLayers().removeAt(0);
			this.map.getLayers().insertAt(0, layer);
		}
		this.preferences.setPreference("ChosenMap", olSource)
		return layer;
	}

	onResize(event){
		this.bw = window.innerWidth;
		this.bh = window.innerHeight;

		this.map.updateSize();
	};

	ngAfterViewInit(){
		super.ngAfterViewInit();
		this.snackbarContainer = document.querySelector('#map-snackbar');
		this.connect();
	}

	addClickHandler(map : any){
		map.on('singleclick', (evt) => {
			let feature = map.forEachFeatureAtPixel(evt.pixel, (feature, layer) => {
				console.log(`Clicked on Feature near ${evt.coordinate}`);
				let pan = ol.animation.pan({
					duration: 1000,
					source: map.getView().getCenter()
				});
				map.beforeRender(pan);
				map.getView().setCenter(feature.getGeometry().getCoordinates());
			})
		});
	}

	ngOnInit(){
		let gotId = this.routeParams.get('mapid');
		this.bw = window.innerWidth;
		this.bh = window.innerHeight;
		this.mapid = gotId;


		this.map = new Ol.Map({
			target: 'mmap',
			layers: [
				this.provider(this.preferences.getPreferences().ChosenMap, false),
				this.graphLayer, this.edgeLayer
			],

			view: new Ol.View({
				center: Ol.proj.fromLonLat([37.41, 8.82], undefined),
				zoom: 3,
				minZoom: 3, maxZoom: 20
			}),
			controls: new Ol.Collection([]),
		});

		this.map.on('pointermove', (event) => {
			let pixel = this.map.getEventPixel(event.originalEvent);
			let feature = this.map.forEachFeatureAtPixel(pixel, (feature) => {
				return feature});

			if (event.dragging){
				// don't display tooltip when dragging the map
				this.currentHover = null;
				return;
			}

			if (feature && feature !== this.currentHover){
				this.currentHover = feature;
				let settings = new DisplaySettings();

				if (feature.values_.geometry instanceof Ol.geom.Point){
					// and all connecting features. create relation here.
					feature.setStyle(settings.NodeStyleHovering	);

					let node = feature.get("DataLink");
					if (node){
						for (let edge of node.connections){
							let view = edge.getView();
							if (view){
								view.setStyle(settings.EdgeStyleHovering);
								this.pendingUndoHovers.add(() => {
									view.setStyle(null);
								});
							}
						}
					}

					this.pendingUndoHovers.add(() => {
						feature.setStyle(settings.NodeStyle);
					});
				} else if (feature.values_.geometry instanceof Ol.geom.LineString){
					// Evaluate if this makes sense, vermutlich nicht..
				}
			} else {
				//this.currentHover = null;
				this.pendingUndoHovers.forEach((func : () => void) => {
					func();
				})
				this.pendingUndoHovers.clear();
			}
		})

		this.addClickHandler(this.map);
	}
}