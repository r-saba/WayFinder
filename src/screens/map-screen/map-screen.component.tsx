import React, { useState, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import MapView, { PROVIDER_GOOGLE } from "react-native-maps";
import { isPointInPolygon } from "geolib";
import { RegionProvider } from "../../context/region.context";

import Search from "../../components/search/search.component";
import OmniboxDirections from "../../components/search/omnibox-directions.component";
import CampusToggle from "../../components/campus-toggle/campus-toggle.component";
import MapOverlays from "../../components/map-overlays/map-overlays.component";
import BuildingInformation from "../../components/building-information/building-information.component";
import { Buildings, getCampusById, buildingToMarker } from "../../constants";
import LocationButton from "../../components/location-button/location-button.component";

import {
  Location,
  Region,
  BuildingId,
  IndoorInformation,
  ZoomLevel,
  IndoorFloor,
  POI,
  MarkerLocation,
  TravelState,
  Building,
} from "../../types/main";
import FloorPicker from "../../components/floor-picker/floor-picker.component";
import {
  FETCHING_CURRENT_LOCATION_DISPLAY_TEXT,
  CURRENT_LOCATION_DISPLAY_TEXT,
} from "../../styles";
import UtilityService from "../../services/utility.service";
import LocationService from "../../services/location.service";

/**
 * Screen for the Map and its related buttons and components
 */
const MapScreen = () => {
  const [currentRegion, setCurrentRegion] = useState<Region>({
    latitude: 0,
    longitude: 0,
    latitudeDelta: 0,
    longitudeDelta: 0,
  });
  const [showBuildingInfo, setShowBuildingInfo] = useState<boolean>(false);
  const [tappedBuilding, setTappedBuilding] = useState<BuildingId | null>(null);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(ZoomLevel.CAMPUS);
  const [indoorInformation, setIndoorInformation] = useState<IndoorInformation>(
    {
      currentFloor: null,
      floors: [],
    }
  );

  const [endLocation, setEndLocation] = useState<MarkerLocation>();
  const [startLocation, setStartLocation] = useState<MarkerLocation>(null);
  const [endLocationFocused, setEndLocationFocused] = useState<boolean>(true);
  const [travelState, setTravelState] = useState<TravelState>(TravelState.NONE);
  const [startLocationDisplay, setStartLocationDisplay] = React.useState<
    string
  >("");

  /**
   * Creates a reference to the MapView Component that is rendered.
   * Allows to access component methods.
   */
  const mapRef = useRef<MapView | undefined>();

  /**
   * Set the region to the SGW campus when this component mounts
   */
  useEffect(() => {
    setCurrentRegion(getCampusById("SGW").region);
  }, []);

  /**
   * Handle building tap event.
   * @param tappedBuilding The tapped building
   */
  const onBuildingTap = (tappedBuilding: Building) => {
    if (travelState === TravelState.NONE) {
      setShowBuildingInfo(true);
    }
    setTappedBuilding(tappedBuilding.id);
    setBuildingMarkerLocation(tappedBuilding);
  };

  /**
   * Set a building as an end location or start location depending on
   * which input the user is focused on.
   * @param building
   */
  const setBuildingMarkerLocation = (building: Building | null) => {
    if (travelState === TravelState.PLANNING) {
      if (endLocationFocused) {
        setEndLocation(building);
      } else {
        setStartLocation(building);
      }
    }
  };

  /**
   * This function closes the additional info panel
   */
  const onClosePanel = () => {
    setShowBuildingInfo(false);
    setTappedBuilding(null);
  };

  /**
   * This functions handles the campus toggle event
   * @param region The region to animate to
   */
  const onCampusToggle = (region: Region) => {
    mapRef.current.animateToRegion(region);
  };

  /**
   * Handles react-native-maps events for indoor floors.
   *
   * @param event The event object for indoor floor entry.
   */
  const onIndoorViewEntry = (event: any) => {
    const buildingInfo = event.nativeEvent.IndoorBuilding;
    const floors: IndoorFloor[] = buildingInfo.levels.map((floor: any) => {
      return {
        level: Number(floor.name),
        index: floor.index,
      };
    });

    const currentFloor: IndoorFloor =
      floors.length > 0
        ? floors.filter(
            (floor) => floor.index === buildingInfo.activeLevelIndex
          )[0]
        : null;
    const temp: IndoorInformation = {
      currentFloor,
      floors,
    };
    setIndoorInformation(temp);
  };

  /**
   * Handles presses on the floor picker
   *
   * @param index Index of the active floor
   */
  const onFloorPickerButtonPress = (index: number) => {
    (mapRef.current as any).setIndoorActiveLevelIndex(index);
    setIndoorInformation({
      currentFloor: indoorInformation.floors.filter(
        (floor) => floor.index === index
      )[0],
      floors: indoorInformation.floors,
    });
  };

  /**
   *
   * @param region Current region of the map
   */
  const handleOnRegionChange = (region: Region) => {
    setCurrentRegion(region);
    setZoomLevel(
      UtilityService.getInstance().getZoomLevelByLatDelta(region.latitudeDelta)
    );
  };

  /**
   *  Set a POI as an end location or start location depending
   *  on which input the user is focused on.
   * @param poi
   */
  const onPOIMarkerPress = (poi: POI | null) => {
    if (endLocationFocused) {
      setTravelState(TravelState.PLANNING);
      if (travelState === TravelState.NONE) {
        setUserCurrentLocation();
      }
      setEndLocation(poi);
    } else {
      setStartLocation(poi);
    }
  };

  /**
   * Set the users current location if location services is on.
   */
  const setUserCurrentLocation = () => {
    setStartLocationDisplay(FETCHING_CURRENT_LOCATION_DISPLAY_TEXT);
    LocationService.getInstance()
      .getCurrentLocationAsync()
      .then((response) => {
        // Set current location
        setCurrentLocation(response.coords);
        setStartLocationBuilding(response.coords);
      })
      .catch((error) => {
        setStartLocationDisplay("");
      });
  };

  /**
   * Checks if the user is in a building. If the user is in a building the start location is set to the building
   * Otherwise, the user's current location is set as the start location
   *
   * @param coordinates Latitude and longitude of the user's location
   */
  const setStartLocationBuilding = (coordinates: Location) => {
    // Attempt to find the building the user is in.
    const isInBuilding = Buildings.find((building) =>
      isPointInPolygon(coordinates, building.boundingBox)
    );
    if (isInBuilding) {
      onBuildingTap(isInBuilding);
      setStartLocation(buildingToMarker(isInBuilding));
    } else {
      setStartLocation(
        UtilityService.getInstance().locationToSearchResult(
          CURRENT_LOCATION_DISPLAY_TEXT,
          CURRENT_LOCATION_DISPLAY_TEXT,
          coordinates
        )
      );
    }
  };

  /**
   * Animates the map to the user's current location
   */
  const animateToCurrentLocation = () => {
    if (currentLocation)
      mapRef.current.animateToRegion({
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: currentRegion.latitudeDelta,
        longitudeDelta: currentRegion.longitudeDelta,
      });
  };

  let search;
  if (
    travelState === TravelState.PLANNING ||
    travelState === TravelState.TRAVELLING
  ) {
    search = (
      <OmniboxDirections
        endLocation={endLocation}
        currentLocation={currentLocation}
        setEndLocation={setEndLocation}
        setStartLocation={setStartLocation}
        startLocation={startLocation}
        setEndLocationFocused={setEndLocationFocused}
        endLocationFocused={endLocationFocused}
        setTravelState={setTravelState}
        updateSearchResults={UtilityService.getInstance().updateSearchResults}
        startLocationDisplay={startLocationDisplay}
        setStartLocationDisplay={setStartLocationDisplay}
      />
    );
  } else if (travelState === TravelState.NONE) {
    search = (
      <Search
        setUserCurrentLocation={setUserCurrentLocation}
        setEndLocation={setEndLocation}
        setTravelState={setTravelState}
        updateSearchResults={UtilityService.getInstance().updateSearchResults}
      />
    );
  }
  return (
    <RegionProvider value={currentRegion}>
      <View style={styles.container}>
        {search}
        <MapView
          testID="mapView"
          ref={mapRef}
          style={styles.map}
          provider={PROVIDER_GOOGLE}
          showsCompass={false}
          showsBuildings
          showsUserLocation
          initialRegion={currentRegion}
          onRegionChangeComplete={(region) => handleOnRegionChange(region)}
          // @ts-ignore
          onIndoorBuildingFocused={(event) => onIndoorViewEntry(event)}
          showsIndoorLevelPicker={false}
          toolbarEnabled={false}
          showsMyLocationButton={false}
        >
          <MapOverlays
            onBuildingTap={onBuildingTap}
            tappedBuilding={tappedBuilding}
            zoomLevel={zoomLevel}
            indoorInformation={indoorInformation}
            onPOIMarkerPress={onPOIMarkerPress}
            endLocation={endLocation}
            startLocation={startLocation}
            travelState={travelState}
          />
        </MapView>

        {travelState === TravelState.NONE && (
          <CampusToggle onCampusToggle={onCampusToggle} />
        )}

        {travelState === TravelState.NONE && (
          <LocationButton
            setUserCurrentLocation={setUserCurrentLocation}
            animateToCurrentLocation={animateToCurrentLocation}
          />
        )}

        <FloorPicker
          indoorInformation={indoorInformation}
          onFloorPickerButtonPress={onFloorPickerButtonPress}
          travelState={travelState}
          zoomLevel={zoomLevel}
        />

        {travelState === TravelState.NONE && (
          <BuildingInformation
            tappedBuilding={tappedBuilding}
            showBuildingInfo={showBuildingInfo}
            onClosePanel={onClosePanel}
          />
        )}
      </View>
    </RegionProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  map: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  campusToggle: {
    position: "absolute",
    bottom: 0,
  },
  marker: {
    backgroundColor: "red",
  },
});

export default MapScreen;
