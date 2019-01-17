/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const Audit = require('./audit');
const i18n = require('../lib/i18n/i18n.js');
const NetworkAnalysisComputed = require('../computed/network-analysis.js');

const UIStrings = {
  /** Descriptive title of a Lighthouse audit that tells the user the round trip times to each origin the page connected to. This is displayed in a list of audit titles that Lighthouse generates. */
  title: 'Network Round Trip Times',
  /** ??? */
  description: 'Network round trip times (RTT) have a large impact on performance. ' +
    'If the RTT to an origin is high, it\'s an indication that servers closer to the user could ' +
    'improve performance.',
};

const str_ = i18n.createMessageInstanceIdFn(__filename, UIStrings);

class NetworkRTT extends Audit {
  /**
   * @return {LH.Audit.Meta}
   */
  static get meta() {
    return {
      id: 'network-rtt',
      scoreDisplayMode: Audit.SCORING_MODES.INFORMATIVE,
      title: str_(UIStrings.title),
      description: str_(UIStrings.description),
      requiredArtifacts: ['devtoolsLogs'],
    };
  }

  /**
   * @param {LH.Artifacts} artifacts
   * @param {LH.Audit.Context} context
   * @return {Promise<LH.Audit.Product>}
   */
  static async audit(artifacts, context) {
    const devtoolsLog = artifacts.devtoolsLogs[Audit.DEFAULT_PASS];
    const analysis = await NetworkAnalysisComputed.request(devtoolsLog, context);

    /** @type {number} */
    let maxRtt = 0;
    const baseRtt = analysis.rtt;
    /** @type {Array<{origin: string, rtt: number}>} */
    const results = [];
    for (const [origin, additionalRtt] of analysis.additionalRttByOrigin.entries()) {
      // TODO: https://github.com/GoogleChrome/lighthouse/issues/7041
      if (!Number.isFinite(additionalRtt)) continue;
      if (origin.startsWith('__')) continue;

      const rtt = additionalRtt + baseRtt;
      results.push({origin, rtt});
      maxRtt = Math.max(rtt, maxRtt);
    }

    results.sort((a, b) => b.rtt - a.rtt);

    const headings = [
      {key: 'origin', itemType: 'text', text: str_(i18n.UIStrings.columnURL)},
      {key: 'rtt', itemType: 'ms', granularity: 1, text: str_(i18n.UIStrings.columnTimeSpent)},
    ];

    const tableDetails = Audit.makeTableDetails(headings, results);

    return {
      score: Math.max(1 - (maxRtt / 150), 0),
      rawValue: maxRtt,
      displayValue: str_(i18n.UIStrings.ms, {timeInMs: maxRtt}),
      details: tableDetails,
    };
  }
}

module.exports = NetworkRTT;
module.exports.UIStrings = UIStrings;
