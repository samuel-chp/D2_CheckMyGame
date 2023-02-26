class IndexedDBAccessor {
    static OPEN_TIMEOUT = 3000;

    constructor(name, version) {
        this.name = name;
        this.version = version;
        this.db = null;
        this.ready = false;
    }

    /**
     * Wrap a request in a Promise to make it awaitable.
     * @param request
     * @returns {Promise<IDBRequest<unknown>>}
     */
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
            if (timeOut >= IndexedDBAccessor.OPEN_TIMEOUT) {
                console.error("DB couldn't be opened.");
                return;
            }
        }
    }

    /**
     * Main method to open an IndexedDB instance.
     * @param objectStores Dict<string, string> { storeName : nameOfKeyAttribute}
     * @returns {Promise<IDBOpenDBRequest>}
     */
    async openDB(objectStores) {
        let instance = this;
        let openRequest = indexedDB.open(this.name, this.version);

        openRequest.onupgradeneeded = function () {
            instance.db = openRequest.result;
            instance.initializeDB(JSON.parse(objectStores));
        };

        openRequest.onerror = function () {
            console.error("Can't open IndexedDB : ", openRequest.error);
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

    /**
     * Initialize IndexedDB with the stores provided. For internal use only, external should use openDB().
     * @param objectStores JSON - Dict<string, string> { storeName : nameOfKeyAttribute}
     * @returns {Promise<void>}
     */
    async initializeDB(objectStores) {
        let createStoresTasks = [];
        console.log(objectStores);
        for (const storeName in objectStores){
            console.log(storeName, " - ", objectStores[storeName]);
            createStoresTasks.push(this.db.createObjectStore(storeName, {keyPath: objectStores[storeName]}));
        }
        await Promise.all(createStoresTasks);
    }

    /**
     * Put a value in the store provided.
     * @param store
     * @param value
     * @returns {Promise<void>}
     */
    async putElement(store, value) {
        await this.waitForOpenDB();
        let transaction = this.db.transaction(store, "readwrite");
        let objStore = transaction.objectStore(store);

        let request = objStore.put(value);
        await this.wrapRequest(request);
    }

    /**
     * Get a value from the store with the elementId provided.
     * @param store
     * @param elementId
     * @returns {Promise<*>}
     */
    async getElement(store, elementId) {
        await this.waitForOpenDB();
        let transaction = this.db.transaction(store, "readwrite");
        let objStore = transaction.objectStore(store);
        return await this.wrapRequest(objStore.get(elementId));
    }
}

let instance;

/**
 * Create an instance of a IndexedDBAccessor and return it.
 * Used with Blazor.
 * @param dbName
 * @param dbVersion
 * @returns {IndexedDBAccessor}
 * @constructor
 */
export function BuildIndexedDBAccessor(dbName, dbVersion)
{
    instance = new IndexedDBAccessor(dbName, dbVersion);
    return instance;
}