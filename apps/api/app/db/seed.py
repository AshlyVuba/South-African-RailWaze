from apps.api.app.schemas.trivia import TriviaOption, TriviaQuestion
from apps.api.app.schemas.waypoint import Waypoint

# Seed data for 4 anchor stations across the Pretoria-to-Cape Town corridor
SEED_WAYPOINTS: list[Waypoint] = [
    Waypoint(
        id="WP_PRETORIA",
        name="Pretoria Station",
        latitude=-25.7588,
        longitude=28.1882,
        elevation_meters=1339.0,
        biome="Highveld",
        tags=["anchor", "origin", "gauteng"],
    ),
    Waypoint(
        id="WP_KIMBERLEY",
        name="Kimberley Station",
        latitude=-28.7419,
        longitude=24.7719,
        elevation_meters=1220.0,
        biome="Diamond Fields",
        tags=["anchor", "heritage", "northern_cape"],
    ),
    Waypoint(
        id="WP_DE_AAR",
        name="De Aar Station",
        latitude=-30.6497,
        longitude=24.0122,
        elevation_meters=1240.0,
        biome="Great Karoo",
        tags=["anchor", "rail_junction", "northern_cape"],
    ),
    Waypoint(
        id="WP_MATJIESFONTEIN",
        name="Matjiesfontein Station",
        latitude=-33.2308,
        longitude=20.5817,
        elevation_meters=890.0,
        biome="Little Karoo Transition",
        tags=["anchor", "heritage", "western_cape"],
    ),
]

SEED_TRIVIA: dict[str, list[TriviaQuestion]] = {
    "WP_PRETORIA": [
        TriviaQuestion(
            id="TRIVIA_PRETORIA_01",
            waypoint_id="WP_PRETORIA",
            question="Which historic locomotive shed served as the primary departure node for Highveld express routes in the 20th century?",
            options=[
                TriviaOption(option_id="opt_1", text="Capital Park Locomotive Shed"),
                TriviaOption(option_id="opt_2", text="Centurion Central Depot"),
                TriviaOption(option_id="opt_3", text="Highveld Steam Works"),
                TriviaOption(option_id="opt_4", text="Tshwane Rail Terminal"),
            ],
            correct_option_id="opt_1",
            points=10,
        )
    ],
    "WP_KIMBERLEY": [
        TriviaQuestion(
            id="TRIVIA_KIMBERLEY_01",
            waypoint_id="WP_KIMBERLEY",
            question="What major historical event in the 1870s transformed Kimberley into a vital rail corridor hub?",
            options=[
                TriviaOption(
                    option_id="opt_1", text="The Gold Rush of the Witwatersrand"
                ),
                TriviaOption(
                    option_id="opt_2", text="The Diamond Rush at the Big Hole"
                ),
                TriviaOption(option_id="opt_3", text="The Karoo Ostrich Boom"),
                TriviaOption(option_id="opt_4", text="The Opening of Table Bay Port"),
            ],
            correct_option_id="opt_2",
            points=10,
        )
    ],
    "WP_DE_AAR": [
        TriviaQuestion(
            id="TRIVIA_DE_AAR_01",
            waypoint_id="WP_DE_AAR",
            question="Why is De Aar historically celebrated in South African rail transit archives?",
            options=[
                TriviaOption(
                    option_id="opt_1",
                    text="It hosted the continent's largest steam locomotive depot",
                ),
                TriviaOption(
                    option_id="opt_2",
                    text="It was the first station to utilize solar electrification",
                ),
                TriviaOption(
                    option_id="opt_3",
                    text="It served as the single international port entry point",
                ),
                TriviaOption(
                    option_id="opt_4",
                    text="It was built entirely over subterranean Karoo aqueducts",
                ),
            ],
            correct_option_id="opt_1",
            points=10,
        )
    ],
    "WP_MATJIESFONTEIN": [
        TriviaQuestion(
            id="TRIVIA_MATJIESFONTEIN_01",
            waypoint_id="WP_MATJIESFONTEIN",
            question="Which iconic Victorian village grew around the Karoo rail stop established by James Logan in 1884?",
            options=[
                TriviaOption(option_id="opt_1", text="Matjiesfontein"),
                TriviaOption(option_id="opt_2", text="Prince Albert"),
                TriviaOption(option_id="opt_3", text="Touws River"),
                TriviaOption(option_id="opt_4", text="Beaufort West"),
            ],
            correct_option_id="opt_1",
            points=10,
        )
    ],
}
