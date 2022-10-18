export default function dateToHMS(date) {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const secs = date.getSeconds();
  return hours * 3600000 + minutes * 60000 + secs * 1000; // milliseconds
}
