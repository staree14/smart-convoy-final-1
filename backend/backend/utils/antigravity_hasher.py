import hashlib
from typing import List

class AntigravityHasher:
    """
    Hasher class for the blockchain logistics system.
    """

    @staticmethod
    def generate_convoy_proof(convoy_id: str, vehicles: List[str], route_id: str, creator_id: str) -> str:
        """
        Generates a SHA-256 hex digest proof for a convoy.
        This proof is used for "Court-Sealed" blockchain logs.

        Args:
            convoy_id (str): Unique identifier for the convoy.
            vehicles (list): List of vehicle identifiers.
            route_id (str): Unique identifier for the route.
            creator_id (str): Unique identifier for the creator.

        Returns:
            str: The SHA-256 hex digest of the deterministic payload.
        """
        # 1. Deterministic Serialization: Sort vehicles alphabetically
        # Ensure all vehicles are strings before sorting
        sorted_vehicles = sorted([str(v) for v in vehicles])
        
        # Join sorted vehicles with comma
        vehicles_str = ",".join(sorted_vehicles)

        # 2. Strict Delimiter joining
        # Format: convoy_id||vehicles_str||route_id||creator_id
        # Ensure string conversion for all fields
        parts = [str(convoy_id), vehicles_str, str(route_id), str(creator_id)]
        payload = "||".join(parts)

        # 3. Encode to UTF-8
        encoded_data = payload.encode("utf-8")

        # 4. Hash using SHA-256
        return hashlib.sha256(encoded_data).hexdigest()
