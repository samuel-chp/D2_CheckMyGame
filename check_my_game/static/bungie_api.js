class BungieAPI {
    constructor(secret_key) {
        this.secret_key = secret_key;
        this.endpoint = "https://www.bungie.net";

        // Tokens and rate for bungie api
        this.rate = 20  // Max number of calls per second, Bungie tells us it's 25 but to be sure...
        this.maxTokens = 20
        this.tokens = this.maxTokens;
        this.lastTokenUpdate = (new Date()).getTime();
    }

    async waitForToken() {
        while (this.tokens < 1) {
            this.addNewTokens();
            await sleep(100);
        }
        this.tokens -= 1
    }

    addNewTokens() {
        const now = (new Date()).getTime();
        const timeSinceUpdate = now - this.lastTokenUpdate;
        const newTokens = Math.floor(timeSinceUpdate * this.rate);
        if (this.tokens + newTokens >= 1) {
            this.tokens = Math.min(this.tokens + newTokens, this.maxTokens);
            this.lastTokenUpdate = now;
        }
    }

    async _get(path, searchParams = {}) {
        await this.waitForToken();

        let url = new URL(`Platform${path}`, this.endpoint);
        for (const param in searchParams) {
            url.searchParams.append(param, searchParams[param]);
        }

        // TODO: bug sometimes on requests _

        try {
            return await $.ajax({
                    url: url.href,
                    cache: false,
                    type: "GET",
                    headers: {'X-API-Key': this.secret_key},
                    datatype: 'json',
                }
            );
        } catch (error) {
            if (error.readyState === 0) {
                return null;
            }
            console.error(error);
        }
    }

    async _post(path, data = {}, searchParams = {}) {
        await this.waitForToken();

        let url = new URL(`Platform${path}`, this.endpoint);
        for (const param in searchParams) {
            url.searchParams.append(param, searchParams[param]);
        }

        try {
            return await $.ajax({
                    url: url.href,
                    cache: false,
                    type: "POST",
                    headers: {'X-API-Key': this.secret_key},
                    data: JSON.stringify(data),
                    datatype: 'json',
                }
            );
        } catch (error) {
            if (error.readyState === 0) {
                return null;
            }
            console.error(error);
        }
    }

    async searchPlayer(displayName, displayNameCode) {
        let path = "/Destiny2/SearchDestinyPlayerByBungieName/all/";
        let data = {
            "displayName": displayName,
            "displayNameCode": displayNameCode,
        };
        return await this._post(path, data);
    }

    async fetchPlayerProfile(membershipId, membershipType) {
        let path = `/Destiny2/${membershipType}/Profile/${membershipId}/`;
        let searchParams = {
            "components": "Characters"
        };
        return await this._get(path, searchParams);
    }

    async fetchPlayerStats(membershipId,
                           membershipType,
                           characterId = 0,
                           daystart = "",
                           dayend = "",
                           groups = "",
                           modes = "",
                           periodType = "") {
        let path = `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats`;
        let searchParams = {};
        {
            if (daystart !== "") {
                searchParams.append("daystart", daystart);
            }
            if (dayend !== "") {
                searchParams.append("dayend", dayend);
            }
            if (groups !== "") {
                searchParams.append("groups", groups);
            }
            if (modes !== "") {
                searchParams.append("modes", modes);
            }
            if (periodType !== "") {
                searchParams.append("periodType", periodType);
            }
        }
        return await this._get(path, searchParams);
    }

    async fetchActivityHistory(membershipId,
                               membershipType,
                               characterId,
                               mode = 5,
                               page = 0,
                               count = 250) {
        let path = `/Destiny2/${membershipType}/Account/${membershipId}/Character/${characterId}/Stats/Activities`;
        let searchParams = {
            "mode": mode,
            "page": page,
            "count": Math.min(count, 250), // Clamp to max accepted by the API
        }
        return await this._get(path, searchParams);
    }

    async fetchEntityDefinition(entityType, hashIdentifier) {
        let path = `/Destiny2/Manifest/${entityType}/${hashIdentifier}`;
        return await this._get(path);
    }

    async fetchMapDefinition(referenceId) {
        return await this.fetchEntityDefinition("DestinyActivityDefinition", referenceId);
    }

    async fetchCarnageReport(instanceId) {
        let path = `/Destiny2/Stats/PostGameCarnageReport/${instanceId}/`;
        return await this._get(path);
    }

    async fetchClanFromMember(membershipId, membershipType) {
        let path = `/GroupV2/User/${membershipType}/${membershipId}/0/1/`;
        return await this._get(path);
    }

    async fetchClanMembers(groupId) {
        let path = `/GroupV2/${groupId}/Members/`;
        return await this._get(path);
    }

    async fetchClan(groupId) {
        let path = `/GroupV2/${groupId}`;
        return await this._get(path);
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
}

class Guardian {
    static seasonStartDate = new Date("2022-12-06");

    constructor(membershipId, membershipType, displayName = "", displayNameCode = "") {
        this.membershipId = membershipId;
        this.membershipType = membershipType;
        this.displayName = displayName;
        this.displayNameCode = displayNameCode;

        this.playerId = this.getPlayerId(); // redundant but necessary for db
        this.characters = {};
        this.activities = {};
        this.clan = {
            clanId: null,
            clanName: "",
            clanSign: "",
        };
        this.lastUpdate = new Date("2015");
    }

    static getPlayerId(membershipId, membershipType) {
        return String(membershipId) + "-" + String(membershipType);
    }

    static fromJSONObject(obj) {
        let guardian = new Guardian(obj.membershipId, obj.membershipType, obj.displayName, obj.displayNameCode);
        guardian.characters = obj.characters;
        guardian.activities = obj.activities;
        guardian.clan = obj.clan;
        return guardian;
    }

    getPlayerId() {
        return Guardian.getPlayerId(this.membershipId, this.membershipType);
    }

    getLastPlayedCharacter() {
        if (this.characters.length === 0) {
            return null;
        }

        let lastPlayed = {characterId: null, date: new Date("2010")};
        for (let characterId in this.characters) {
            let dateLastPlayed = new Date(this.characters[characterId]["dateLastPlayed"]);
            if (dateLastPlayed > lastPlayed["date"]) {
                lastPlayed["date"] = dateLastPlayed;
                lastPlayed["characterId"] = characterId;
            }
        }
        return this.characters[lastPlayed.characterId];
    }

    async fetchCharacters() {
        const r = await bungieAPI.fetchPlayerProfile(this.membershipId, this.membershipType);

        if (r !== null){
            this.characters = r["Response"]["characters"]["data"];
        }
    }

    async fetchClan() {
        const clanInfo = await bungieAPI.fetchClanFromMember(this.membershipId, this.membershipType);

        if (clanInfo === null) {
            return null;
        }

        // Ensure player has a clan
        if (clanInfo["Response"]["results"].length === 0) {
            return;
        }

        this.clan.clanId = clanInfo["Response"]["results"][0]["group"]["groupId"];
        this.clan.clanName = clanInfo["Response"]["results"][0]["group"]["name"];
        this.clan.clanSign = clanInfo["Response"]["results"][0]["group"]["clanInfo"]["clanCallsign"];
    }

    /**
     * Populate stats for this season only.
     * @param characterId
     * @param startPage included
     * @param endPage not included
     * @param numberOfActivitiesPerPage
     * @returns {Promise<void>}
     * @private
     */
    async populateCharacterActivities(characterId, startPage, endPage, numberOfActivitiesPerPage) {
        startPage = Math.min(startPage, 200);
        endPage = Math.min(endPage, 200);

        // Ensure characterId exists
        if (!(characterId in this.activities)) {
            this.activities[characterId] = [];
        }

        // Call Bungie API
        let tasks = [];
        for (let i = startPage; i < endPage; i++) {
            tasks.push(bungieAPI.fetchActivityHistory(this.membershipId, this.membershipType, characterId, 5, i));
        }
        let results = await Promise.all(tasks); // Increase speed

        for (const result of results) {
            if (result === null) {
                continue;
            }

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

                // Ensure it's not already here
                if (this.activities[characterId].filter(a => a.instanceId === activity["activityDetails"]["instanceId"]).length > 0) {
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

                // TODO: prevent cache

                this.activities[characterId].push(activityData);
            }
        }

        // Ensure array is sorted reverse chronologically
        this.activities[characterId].sort((a, b) => {
            let d1 = new Date(a.period);
            let d2 = new Date(b.period);
            return (d1 < d2) ? 1 : ((d2 > d1) ? -1 : 0);
        });

        // Store in session after each data fetch
        this.save();
    }

    _aggregateStats(characterId, gamemode, startDate, endDate) {
        startDate = new Date(startDate);
        endDate = new Date(endDate);

        let result = {
            "activitiesEntered": 0,
            "activitiesWon": 0,
            "kills": 0,
            "assists": 0,
            "deaths": 0,
            "secondsPlayed": 0,
            "score": 0,
        };

        // Aggregate
        for (const activity of this.activities[characterId]) {
            let period = new Date(activity["period"]);

            // Check date
            if (period < startDate) {
                break; // Activites are stored chronologically
            }
            if (period > endDate) {
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
        return this._aggregateStats(characterId, gamemode, Guardian.seasonStartDate, new Date());
    }

    /**
     * From reset.
     * @param characterId
     * @param gamemode
     * @returns {{}}
     */
    getStatsWeekly(characterId, gamemode) {
        let lastReset = new Date();
        if (lastReset.getDay() === 2) {
            lastReset.setDate(lastReset.getDate() - 7);
        } else {
            lastReset.setDate(lastReset.getDate() - (lastReset.getDay() + 5) % 7);
        }
        lastReset.setHours(17, 0, 0);
        return this._aggregateStats(characterId, gamemode, lastReset, new Date());
    }

    save() {
        localDb.addGuardian(this);
    }
}

class LocalDB {
    static OPEN_TIMEOUT = 3000;

    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.db = null;
        this.ready = false;
    }

    wrapRequest(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async waitForOpenDB() {
        let timeOut = 0;
        while (!this.ready) {
            await sleep(100);
            timeOut += 100;
            if (timeOut >= LocalDB.OPEN_TIMEOUT) {
                console.error("LocalDB couldn't be opened.");
                return;
            }
        }
    }

    async openDB() {
        let instance = this;
        let openRequest = indexedDB.open(this.name, this.version);

        openRequest.onupgradeneeded = function () {
            instance.db = openRequest.result;
            instance.initializeDB();
        };

        openRequest.onerror = function () {
            console.error("Error", openRequest.error);
        };

        openRequest.onsuccess = function () {
            instance.db = openRequest.result;
            instance.ready = true;
        };

        return openRequest;
    }

    async deleteDB() {
        await indexedDB.deleteDatabase(this.name);
        this.db = null;
    }

    async initializeDB() {
        let createObjectsTasks = [
            this.db.createObjectStore('guardians', {keyPath: 'playerId'}),
            this.db.createObjectStore('carnageReports', {keyPath: 'instanceId'}),
            this.db.createObjectStore('maps', {keyPath: 'referenceId'}),
        ];
        let results = await Promise.all(createObjectsTasks);
        // db.deleteObjectStore('books');
    }

    async putElement(store, value) {
        await this.waitForOpenDB();
        let transaction = this.db.transaction(store, "readwrite");
        let objStore = transaction.objectStore(store);

        let request = objStore.put(value);
        return this.wrapRequest(request);
    }

    async getElement(store, elementId) {
        await this.waitForOpenDB();
        let transaction = this.db.transaction(store, "readwrite");
        let objStore = transaction.objectStore(store);
        return this.wrapRequest(objStore.get(elementId));
    }

    async addGuardian(guardian) {
        return this.putElement("guardians", guardian);
    }

    async getGuardian(playerId) {
        return this.getElement("guardians", playerId);
    }

    async addCarnageReport(carnageReport) {
        return this.putElement("carnageReports", carnageReport);
    }

    async getCarnageReport(instanceId) {
        return this.getElement("carnageReports", instanceId);
    }

    async addMapPvP(mapPvP) {
        return this.putElement("maps", mapPvP);
    }

    async getMapPvP(referenceId) {
        return this.getElement("maps", referenceId);
    }
}

function getPlayerId(membershipId, membershipType) {
    return String(membershipId) + "-" + String(membershipType);
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

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getSessionVariable(key) {
    let r = sessionStorage.getItem(key);
    if (!r) {
        r = "{}";
    }
    r = JSON.parse(r);
    return r;
}

function setSessionVariable(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

// DEBUG
function clearSession() {
    sessionStorage.setItem("guardians", "{}");
    sessionStorage.setItem("mapInfo", "{}");
}


bungieAPI = new BungieAPI('d1afcba184f644bdb4a4bb4a09e51e50');

localDb = new LocalDB("CheckMyGame", 1);
localDb.openDB();