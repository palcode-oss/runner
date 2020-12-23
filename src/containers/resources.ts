import * as os from 'os';
import { getNumericEnv } from '../helpers';

export const getMaxCPUs = () => {
    const totalCPUCount = os.cpus().length;
    const allocatedCPUCount = totalCPUCount * getNumericEnv('PAL_CPU_PROPORTION', 0.2);
    // CPU quota in units of 10^9 CPUs/vCPUs
    // written as cores * 10^9
    return allocatedCPUCount * Math.pow(10, 9);
}
