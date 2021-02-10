"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const moment = require("moment-timezone");
class Helper {
    /**
     * Ermittelt wieviele Minuten seit dem letzten Besuch verstrichen sind
     *
     * @param jovo - unser liebes Jovo objekt
     * @returns Minutenanzhal seit letztem Besuch
     */
    static getDiffToLastVisitInMinutes(jovo) {
        const lastRequestTimestamp = jovo.$data.lastUsedAt;
        if (jovo.$user.isNewUser()) {
            return 0;
        }
        if (!lastRequestTimestamp) {
            return 0;
        }
        const now = moment();
        const lastVisit = moment(lastRequestTimestamp);
        const diffInMinutes = now.diff(lastVisit, 'minutes');
        return diffInMinutes;
    }
}
exports.Helper = Helper;
//# sourceMappingURL=helper.js.map