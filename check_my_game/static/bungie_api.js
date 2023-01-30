class BungieAPI {
    constructor(secret_key) {
        this.secret_key = secret_key;
        this.endpoint = "https://www.bungie.net";
    }

    async searchPlayer(displayName, displayNameCode) {
        try {
            return await $.ajax({
                    url: new URL('Platform/Destiny2/SearchDestinyPlayerByBungieName/all/', this.endpoint).href,
                    type: "POST",
                    headers: {'X-API-Key': this.secret_key},
                    data: JSON.stringify({
                        "displayName": displayName,
                        "displayNameCode": displayNameCode,
                    }),
                    datatype: 'json',
                }
            );
        } catch (error) {
            console.error(error);
        }
    }

    async fetchPlayerProfile(membershipId, membershipType) {
        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Profile/${membershipId}/`, this.endpoint);
        targetURL.searchParams.append("components", "Characters");

        try {
            return await $.ajax({
                    url: targetURL.href,
                    type: "GET",
                    headers: {'X-API-Key': this.secret_key},
                    datatype: 'json',
                }
            )
        } catch (error) {
            console.error(error);
        }
    }

    async fetchPlayerStats(membershipId,
                           membershipType,
                           characterId = 0,
                           daystart = "",
                           dayend = "",
                           groups = "",
                           modes = "",
                           periodType = "") {
        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/`, this.endpoint);
        {
            if (daystart !== "") {
                targetURL.searchParams.append("daystart", daystart);
            }
            if (dayend !== "") {
                targetURL.searchParams.append("dayend", dayend);
            }
            if (groups !== "") {
                targetURL.searchParams.append("groups", groups);
            }
            if (modes !== "") {
                targetURL.searchParams.append("modes", modes);
            }
            if (periodType !== "") {
                targetURL.searchParams.append("periodType", periodType);
            }
        }

        try {
            return await $.ajax({
                url: targetURL.href,
                type: "GET",
                headers: {'X-API-Key': this.secret_key},
                datatype: 'json',
                success: function (result) {
                    // console.log(result);
                },
                error: function (error) {
                    // console.log(error);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    async fetchActivityHistory(membershipId,
                               membershipType,
                               characterId,
                               mode = 5,
                               page = 0,
                               count = 250) {
        // Clamp to max accepted by the API
        count = Math.min(count, 250);

        let targetURL = new URL(`Platform/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities`, this.endpoint);
        targetURL.searchParams.append("mode", mode);
        targetURL.searchParams.append("page", page);
        targetURL.searchParams.append("count", count);

        try {
            return await $.ajax({
                url: targetURL.href,
                type: "GET",
                headers: {'X-API-Key': this.secret_key},
                datatype: 'json',
                success: function (result) {
                    // console.log(result);
                },
                error: function (error) {
                    // console.log(error);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    async fetchEntityDefinition(entityType, hashIdentifier) {
        let targetURL = new URL(`Platform/Destiny2/Manifest/${entityType}/${hashIdentifier}`, this.endpoint);

        try {
            return await $.ajax({
                url: targetURL.href,
                type: "GET",
                headers: {'X-API-Key': this.secret_key},
                datatype: 'json',
                success: function (result) {
                    // console.log(result);
                },
                error: function (error) {
                    // console.log(error);
                }
            });
        } catch (error) {
            console.error(error);
        }
    }

    async fetchMapDefinition(referenceId) {
        return await this.fetchEntityDefinition("DestinyActivityDefinition", referenceId);
    }

    getClassTypeStr(classType) {
        if (classType === 0) {
            return "Titan";
        } else if (classType === 1) {
            return "Hunter";
        } else if (classType === 2) {
            return "Arcanist";
        }
        return "";
    }

    getGamemodeStr(gamemodeInt) {
        const d = {
            "2": "Story",
            "3": "Strike",
            "4": "Raid",
            "5": "All PvP",
            "6": "Patrol",
            "7": "All PvE",
            "9": "Reserved9",
            "10": "Control",
            "11": "Reserved11",
            "12": "Clash",
            "13": "Reserved13",
            "15": "Crimson Doubles",
            "16": "Nightfall",
            "17": "Heroic Nightfall",
            "18": "AllStrikes",
            "19": "IronBanner",
            "20": "Reserved20",
            "21": "Reserved21",
            "22": "Reserved22",
            "24": "Reserved24",
            "25": "AllMayhem",
            "26": "Reserved26",
            "27": "Reserved27",
            "28": "Reserved28",
            "29": "Reserved29",
            "30": "Reserved30",
            "31": "Supremacy",
            "32": "Private Matches All",
            "37": "Survival",
            "38": "Countdown",
            "39": "TrialsOfTheNine",
            "40": "Social",
            "41": "TrialsCountdown",
            "42": "TrialsSurvival",
            "43": "Iron Banner Control",
            "44": "Iron Banner Clash",
            "45": "Iron Banner Supremacy",
            "46": "Scored Nightfall",
            "47": "Scored Heroic Nightfall",
            "48": "Rumble",
            "49": "AllDoubles",
            "50": "Doubles",
            "51": "Private Matches Clash",
            "52": "Private Matches Control",
            "53": "Private Matches Supremacy",
            "54": "Private Matches Countdown",
            "55": "Private Matches Survival",
            "56": "Private Matches Mayhem",
            "57": "Private Matches Rumble",
            "58": "Heroic Adventure",
            "59": "Showdown",
            "60": "Lockdown",
            "61": "Scorched",
            "62": "ScorchedTeam",
            "63": "Gambit",
            "64": "All PvE Competitive",
            "65": "Breakthrough",
            "66": "BlackArmoryRun",
            "67": "Salvage",
            "68": "IronBannerSalvage",
            "69": "PvP Competitive",
            "70": "PvP Quickplay",
            "71": "Clash Quickplay",
            "72": "Clash Competitive",
            "73": "Control Quickplay",
            "74": "Control Competitive",
            "75": "Gambit Prime",
            "76": "Reckoning",
            "77": "Menagerie",
            "78": "Vex Offensive",
            "79": "Nightmare Hunt",
            "80": "Elimination",
            "81": "Momentum",
            "82": "Dungeon",
            "83": "Sundial",
            "84": "Trials Of Osiris",
            "85": "Dares",
            "86": "Offensive",
            "87": "Lost Sector",
            "88": "Rift",
            "89": "Zone Control",
            "90": "IronBannerRift",
            "91": "IronBannerZoneControl"
        };
        return d[gamemodeInt];
    }
    
    getPvPMapInfo(referenceId) {
        // TODO
        const d = {
            "1": {
                name: "Javelin-4",
                pgcrImage: "/img/destiny_content/pgcr/crucible_shaft.jpg",
                description: "Warsat Launch Facility, Io",
            },
        };
        
        return d[referenceId];
    }
}

class PlayerHistory {
    constructor(membershipId, membershipType, characterIds) {
        this.membershipId = membershipId;
        this.membershipType = membershipType;
        this.characterIds = characterIds;

        this.seasonStartDate = new Date("2022-12-06");

        // Init storage
        this.activities = {};
        characterIds.forEach(characterId => {
            this.activities[characterId] = [];
        })
    }

    async populateFromActivities() {
        for (const characterId of this.characterIds) {
            await this._populateCharacterFromActivities(characterId);
        }
    }

    /**
     * Populate stats for this season only.
     * @param characterId
     * @returns {Promise<void>}
     * @private
     */
    async _populateCharacterFromActivities(characterId) {
        // const instance = this;

        let page = 0
        let result;
        do {
            result = await bungieAPI.fetchActivityHistory(this.membershipId, this.membershipType, characterId, 5, page);

            // Check empty response on page 0
            if (Object.keys(result["Response"]).length === 0) {
                break;
            }

            // Parse activities
            for (const activity of result["Response"]["activities"]) {
                const day = new Date(activity["period"]);

                // Handle API gamemode error
                if (activity["activityDetails"]["modes"].includes(0) || (activity["activityDetails"]["mode"] === 0)) {
                    continue;
                }

                // Add to activity history
                let activityData = {
                    period: day,
                    mode: activity["activityDetails"]["mode"],
                    modes: activity["activityDetails"]["modes"],
                    instanceId: activity["activityDetails"]["instanceId"],
                    referenceId: activity["activityDetails"]["referenceId"], // Get the map from entityDefinition with this hash
                    duration: activity["values"]["activityDurationSeconds"]["basic"]["value"],
                    values: {
                        "score": activity["values"]["score"]["basic"]["value"],
                        "kills": activity["values"]["kills"]["basic"]["value"],
                        "assists": activity["values"]["assists"]["basic"]["value"],
                        "deaths": activity["values"]["deaths"]["basic"]["value"],
                        "secondsPlayed": activity["values"]["timePlayedSeconds"]["basic"]["value"],
                        "winner": activity["values"]["standing"]["basic"]["value"] < 1,
                    }
                };
                this.activities[characterId].push(activityData);
            }

            // Next page for api
            ++page;
        } while (Object.keys(result["Response"]).length > 0);
    }

    getEmptyStatsDict() {
        return {
            "activitiesEntered": 0,
            "activitiesWon": 0,
            "kills": 0,
            "assists": 0,
            "deaths": 0,
            "secondsPlayed": 0,
            "score": 0,
        }
    }

    _aggregateStats(characterId, gamemode, startDate, endDate) {
        let result = this.getEmptyStatsDict();

        // Aggregate
        for (const activity of this.activities[characterId]) {
            // Check date
            if (activity["period"] < startDate) {
                break; // Activites are stored chronologically
            }
            if (activity["period"] > endDate) {
                continue;
            }

            // Check gamemode
            if (!activity["modes"].includes(parseInt(gamemode))) {
                continue;
            }

            result["activitiesEntered"] += 1;
            result["activitiesWon"] += activity["values"]["winner"] ? 1 : 0;
            result["kills"] += activity["values"]["kills"];
            result["assists"] += activity["values"]["assists"];
            result["deaths"] += activity["values"]["deaths"];
            result["secondsPlayed"] += activity["values"]["secondsPlayed"];
            result["score"] += activity["values"]["score"];
        }

        return result;
    }

    getStatsAllTime(characterId, gamemode) {
        // Return dict:
        // {
        //     statName:  value
        // }
        // return this.allTime[characterId][gamemode];
        return this._aggregateStats(characterId, gamemode, new Date("2015-01-01"), new Date());
    }

    getStatsSeasonal(characterId, gamemode) {
        return this._aggregateStats(characterId, gamemode, this.seasonStartDate, new Date());
    }

    /**
     * From reset.
     * @param characterId
     * @param gamemode
     * @returns {{}}
     */
    getStatsWeekly(characterId, gamemode) {
        let lastReset = new Date();
        lastReset.setDate(lastReset.getDate() - (lastReset.getDay() + 5) % 7);
        lastReset.setHours(17, 0, 0);
        return this._aggregateStats(characterId, gamemode, lastReset, new Date());
    }
}

function dateDiffInDays(a, b) {
    const _MS_PER_DAY = 1000 * 60 * 60 * 24;
    // Discard the time and time-zone information.
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());

    return Math.floor((utc2 - utc1) / _MS_PER_DAY);
}

function formatDateToAPIFormat(date) {
    return date.toISOString().split('T')[0];
}


bungieAPI = new BungieAPI('d1afcba184f644bdb4a4bb4a09e51e50');