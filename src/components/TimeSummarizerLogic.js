import moment from "moment";

export default {
  /**
   *
   * @param {string} input
   */
  calculate(input) {
    input = input.trim();

    const lines = input.split("\n");
    const result = {
      parsed: []
    };

    for (let line of lines) {
      result.parsed.push(parseLine(line));
    }

    result.total = calculateTotal(result.parsed);

    return result;
  }
};

/**
 *
 * @param {string} line
 */
function parseLine(line) {
  line = line.trim();

  const split = line.split("-");
  const from = new moment(split[0], "HH:mm");
  const to = new moment(split[1], "HH:mm");

  return {
    input: line,
    from: from,
    to: to,
    duration: moment.duration(to.diff(from))
  };
}

function calculateTotal(parsedLines) {
  let duration = undefined;

  for (let parsed of parsedLines) {
    if (duration) {
      duration.add(parsed.duration);
    } else {
      duration = parsed.duration.clone();
    }
  }

  return {
    duration,
    workStart: parsedLines[0].from,
    normalizedWorkEnd: parsedLines[0].from.clone().add(duration)
  };
}
