import math
from typing import Tuple, Dict, Any

class GeospatialTransformer:
    """Geospatial Georeferencing & WGS84 / UTM Coordinate Engine for AscentX."""
    
    def __init__(self, lat: float = 47.3769, lon: float = 8.5417, alt: float = 408.0):
        self.lat = lat
        self.lon = lon
        self.alt = alt

    @staticmethod
    def latlon_to_utm(lat: float, lon: float) -> Tuple[float, float, int, str]:
        """Convert WGS84 Lat/Lon to UTM Easting, Northing, Zone Number & Hemisphere."""
        zone_number = int((lon + 180) / 6) + 1
        hemisphere = "N" if lat >= 0 else "S"
        
        # Approximate WGS84 to UTM conversion formula
        lat_rad = math.radians(lat)
        lon_rad = math.radians(lon)
        central_meridian = math.radians((zone_number - 1) * 6 - 180 + 3)
        
        k0 = 0.9996
        a = 6378137.0
        e_sq = 0.00669438
        
        N = a / math.sqrt(1 - e_sq * math.sin(lat_rad)**2)
        T = math.tan(lat_rad)**2
        C = (e_sq / (1 - e_sq)) * math.cos(lat_rad)**2
        A = (lon_rad - central_meridian) * math.cos(lat_rad)
        
        M = a * ((1 - e_sq/4 - 3*e_sq**2/64 - 5*e_sq**3/256) * lat_rad
                 - (3*e_sq/8 + 3*e_sq**2/32 + 45*e_sq**3/1024) * math.sin(2*lat_rad)
                 + (15*e_sq**2/256 + 45*e_sq**3/1024) * math.sin(4*lat_rad)
                 - (35*e_sq**3/3072) * math.sin(6*lat_rad))
                 
        easting = 500000.0 + k0 * N * (A + (1 - T + C) * A**3/6 + (5 - 18*T + T**2 + 72*C - 58*e_sq) * A**5/120)
        northing = k0 * (M + N * math.tan(lat_rad) * (A**2/2 + (5 - T + 9*C + 4*C**2) * A**4/24 + (61 - 58*T + T**2 + 600*C - 330*e_sq) * A**6/720))
        
        if lat < 0:
            northing += 10000000.0
            
        return round(easting, 3), round(northing, 3), zone_number, hemisphere

    def get_reference_location(self) -> Dict[str, Any]:
        easting, northing, zone, hemi = self.latlon_to_utm(self.lat, self.lon)
        return {
            "latitude": self.lat,
            "longitude": self.lon,
            "altitude_m": self.alt,
            "utm_easting": easting,
            "utm_northing": northing,
            "utm_zone": f"{zone}{hemi}",
            "crs": f"EPSG:326{zone:02d}" if hemi == "N" else f"EPSG:327{zone:02d}"
        }
