# main.py
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any
import ee
import datetime

# === MODELS ===
class GeoJsonPolygon(BaseModel):
    type: str
    coordinates: List[List[List[float]]]

class ExportRequest(BaseModel):
    polygon: GeoJsonPolygon
    year: int
    index_name: str

# === INITIALIZATION ===
app = FastAPI(title="MangrovePulse API", description="API for mangrove health monitoring using Google Earth Engine.")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Ganti dengan domain frontend Anda di produksi
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

try:
    ee.Initialize(project="ee-muhammadyusyafarthur")
    print("✅ GEE initialized successfully (Cloud Project: ee-muhammadyusyafarthur)")
except Exception as e:
    print("⚠️ GEE not initialized, trying to authenticate...")
    ee.Authenticate()
    ee.Initialize(project="ee-muhammadyusyafarthur")
    print("✅ GEE authenticated and initialized successfully!")


# === GEE HELPER FUNCTIONS ===

def maskS2clouds(image):
    """Fungsi untuk menapis awan dari citra Sentinel-2 menggunakan band QA60."""
    qa = image.select('QA60')
    cloudBitMask = 1 << 10
    cirrusBitMask = 1 << 11
    mask = qa.bitwiseAnd(cloudBitMask).eq(0).And(qa.bitwiseAnd(cirrusBitMask).eq(0))
    return image.updateMask(mask).divide(10000)

# === API ROUTES ===

@app.get("/")
def home():
    """Endpoint status server."""
    return {"message": "MangrovePulse API active 🚀"}

@app.get("/indices")
def get_all_indices(lat: float, lon: float, year: int = 2024):
    """Menghitung NDVI, NDWI, dan MVI untuk koordinat tertentu."""
    try:
        point = ee.Geometry.Point([lon, lat])
        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .filterBounds(point)
            .map(maskS2clouds)
            .sort("CLOUDY_PIXEL_PERCENTAGE")
            .first()
        )
        
        band_names = image.bandNames().getInfo()
        if not band_names:
            return {"error": f"No cloud-free imagery available for {year}.", "status": "FAILED"}

        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
        mvi = image.normalizedDifference(['B8', 'B5']).rename('MVI')
        indices_image = ee.Image([ndvi, ndwi, mvi])

        values = indices_image.reduceRegion(reducer=ee.Reducer.mean(), geometry=point.buffer(10), scale=10, maxPixels=1e9).getInfo()

        return { "lat": lat, "lon": lon, "indices": values, "status": "OK" }
    except Exception as e:
        return {"error": str(e), "status": "FAILED"}

@app.get("/map_layer/{index_name}")
def get_map_layer(index_name: str, year: int = 2024):
    """Menghasilkan URL tile layer untuk tahun tertentu."""
    try:
        date_filter = ee.Filter.date(f'{year}-01-01', f'{year}-12-31')
        collection = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filter(date_filter)
            .map(maskS2clouds)
            .median()
        )

        band_names = collection.bandNames().getInfo()
        if not band_names:
            return {"error": f"No cloud-free imagery available for {year}.", "status": "FAILED"}

        index_formulas = {
            "NDVI": collection.normalizedDifference(['B8', 'B4']),
            "NDWI": collection.normalizedDifference(['B3', 'B8']),
            "MVI": collection.normalizedDifference(['B8', 'B5']),
        }

        if index_name not in index_formulas:
            return {"error": "Index not supported", "status": "FAILED"}

        image = index_formulas[index_name]
        
        vis_params = {
            "NDVI": {"min": -0.2, "max": 0.8, "palette": ['#d73027', '#fdae61', '#ffffbf', '#a6d96a', '#1a9850']},
            "NDWI": {"min": -0.5, "max": 0.5, "palette": ['#ff0000', '#ffff00', '#00ffff', '#0000ff']},
            "MVI": {"min": -0.2, "max": 0.8, "palette": ['#d73027', '#fdae61', '#ffffbf', '#a6d96a', '#1a9850']},
        }

        visualized_image = image.visualize(**vis_params[index_name])
        map_id = ee.data.getMapId({"image": visualized_image})
        tile_url = map_id["tile_fetcher"].url_format

        return {"tile_url": tile_url, "status": "OK"}

    except Exception as e:
        return {"error": str(e), "status": "FAILED"}

@app.post("/analyze-area")
def analyze_area(polygon: GeoJsonPolygon, year: int = 2024):
    """Menganalisis area berdasarkan poligon GeoJSON secara efisien."""
    try:
        aoi = ee.Geometry.Polygon(polygon.coordinates)
        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .filterBounds(aoi)
            .map(maskS2clouds)
            .median()
        )
        
        band_names = image.bandNames().getInfo()
        if not band_names:
            return {"error": f"No cloud-free imagery available for {year}.", "status": "FAILED"}

        ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
        ndwi = image.normalizedDifference(['B3', 'B8']).rename('NDWI')
        mvi = image.normalizedDifference(['B8', 'B5']).rename('MVI')
        indices_image = ee.Image([ndvi, ndwi, mvi])

        stats_dict = indices_image.reduceRegion(reducer=ee.Reducer.mean(), geometry=aoi, scale=10, maxPixels=1e13)
        total_area = aoi.area()
        mangrove_class = ndvi.gt(0.3).And(ndwi.gt(0))
        mangrove_area = ee.Image.pixelArea().updateMask(mangrove_class).reduceRegion(reducer=ee.Reducer.sum(), geometry=aoi, scale=10, maxPixels=1e13).get('area')

        final_results_dict = ee.Dictionary({
            'stats': stats_dict,
            'total_area_m2': total_area,
            'mangrove_area_m2': mangrove_area
        })

        results = final_results_dict.getInfo()

        return {
            "status": "OK",
            "stats": results['stats'],
            "area_m2": results['total_area_m2'],
            "land_cover": {
                "mangrove_area_m2": results['mangrove_area_m2'],
                "total_area_m2": results['total_area_m2']
            },
            "year": year
        }

    except Exception as e:
        return {"error": str(e), "status": "FAILED"}

@app.get("/timeseries")
def get_timeseries(lat: float, lon: float):
    """Mengambil data time series NDVI tahunan."""
    try:
        point = ee.Geometry.Point([lon, lat])
        years = ee.List.sequence(2019, 2024)

        def get_annual_ndvi(year):
            start_date = ee.Date.fromYMD(year, 1, 1)
            end_date = start_date.advance(1, 'year')
            image = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED").filterBounds(point).filterDate(start_date, end_date).map(maskS2clouds).median()
            ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI')
            mean_ndvi = ndvi.reduceRegion(reducer=ee.Reducer.mean(), geometry=point.buffer(30), scale=10, maxPixels=1e9).get('NDVI')
            return ee.Feature(None, {'year': year, 'ndvi': mean_ndvi})

        ndvi_collection = ee.FeatureCollection(years.map(get_annual_ndvi))
        result = ndvi_collection.getInfo()
        timeline = [{'year': f['properties']['year'], 'ndvi': f['properties']['ndvi']} for f in result['features']]
        
        return { "status": "OK", "timeline": timeline }

    except Exception as e:
        return {"error": str(e), "status": "FAILED"}

@app.post("/export-tiff")
def export_tiff(request: ExportRequest):
    """Menghasilkan URL download GeoTIFF untuk area dan indeks tertentu."""
    try:
        aoi = ee.Geometry.Polygon(request.polygon.coordinates)
        year = request.year
        index_name = request.index_name

        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .filterBounds(aoi)
            .map(maskS2clouds)
            .median()
        )

        band_names = image.bandNames().getInfo()
        if not band_names:
            return {"error": f"No cloud-free imagery available for {year}.", "status": "FAILED"}

        index_formulas = {
            "NDVI": image.normalizedDifference(['B8', 'B4']),
            "NDWI": image.normalizedDifference(['B3', 'B8']),
            "MVI": image.normalizedDifference(['B8', 'B5']),
        }

        if index_name not in index_formulas:
            return {"error": "Index not supported", "status": "FAILED"}

        index_image = index_formulas[index_name]
        clipped_image = index_image.clip(aoi)

        download_url = clipped_image.getDownloadURL({
            'scale': 10,
            'crs': 'EPSG:4326',
            'format': 'GEO_TIFF',
            'fileName': f'MangrovePulse_{index_name}_{year}'
        })

        return {"download_url": download_url, "status": "OK"}

    except Exception as e:
        return {"error": str(e), "status": "FAILED"}

@app.post("/export-to-drive")
def export_to_drive(request: ExportRequest):
    """
    Memulai tugas ekspor GeoTIFF ke Google Drive untuk area yang besar.
    """
    try:
        aoi = ee.Geometry.Polygon(request.polygon.coordinates)
        year = request.year
        index_name = request.index_name

        image = (
            ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED")
            .filterDate(f"{year}-01-01", f"{year}-12-31")
            .filterBounds(aoi)
            .map(maskS2clouds)
            .median()
        )

        band_names = image.bandNames().getInfo()
        if not band_names:
            return {"error": f"No cloud-free imagery available for {year}.", "status": "FAILED"}

        index_formulas = {
            "NDVI": image.normalizedDifference(['B8', 'B4']),
            "NDWI": image.normalizedDifference(['B3', 'B8']),
            "MVI": image.normalizedDifference(['B8', 'B5']),
        }

        if index_name not in index_formulas:
            return {"error": "Index not supported", "status": "FAILED"}

        index_image = index_formulas[index_name]
        clipped_image = index_image.clip(aoi)

        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        task_description = f"Export_{index_name}_{year}_{timestamp}"
        
        task = ee.batch.Export.image.toDrive(
            image=clipped_image,
            description=task_description,
            folder='MangrovePulse_Exports',
            fileNamePrefix=task_description,
            scale=10,
            crs='EPSG:4326'
        )

        task.start()

        return {
            "status": "OK",
            "message": f"Export task started. Check the 'MangrovePulse_Exports' folder in your Google Drive in a few minutes. Task ID: {task.id}"
        }

    except Exception as e:
        return {"error": str(e), "status": "FAILED"}
