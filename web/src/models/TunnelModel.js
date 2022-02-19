import { ObjModel } from './ObjModel.js';
import NetDevParamsModel from './NetDevParamsModel.js';
import SubnetModel from './SubnetModel.js';

export const TunnelTypes = [
  {
    value: 'ipip',
    label: 'IPIP'
  },
  {
    value: 'ip6tnl',
    label: 'IPIP6'
  },
  {
    value: 'vxlan',
    label: 'VXLAN'
  },
  {
    value: 'gre',
    label: 'GRE'
  },
  {
    value: 'wireguard',
    label: 'Wireguard'
  },
  {
    value: 'xfrm',
    label: 'XFRM'
  },
  {
    value: 'l2tp',
    label: 'L2TP'
  }
];

export const XfrmTunnelModes = [
  {
    value: 'xfrm',
    label: 'XFRM Interface'
  },
  {
    value: 'vti',
    label: 'VTI'
  },
  {
    value: 'vti6',
    label: 'VTI6'
  },
];

export class TunnelDeviceParams {
  constructor(mode, netns) {
    this.mode = mode;
    this.netns = netns;
  }

  toDict(mode, getDictIdbyId) {
    const ret = {};
    if (this.netns)
      ret.netns = getDictIdbyId(this.netns);
    if (mode === "xfrm" && this.mode)
      ret.mode = this.mode;
    return ret;
  }
}

export default class TunnelModel extends ObjModel {
  constructor(id, name, type, mode, subnets, link1, link2, dev1Params,
    dev2Params, getItemById) {
    super(id, name, type);
    this.desc = `
Tunnel devices implement virtual networks on top of other networks
`;
    this.mode = mode;
    this.subnets = subnets;
    this.link1 = link1;
    this.link2 = link2;
    let ns1 = dev1Params ? dev1Params.netns : null;
    let ns2 = dev2Params ? dev2Params.netns : null;
    this.dev1Params = dev1Params;
    this.dev2Params = dev2Params;
    if (getItemById) {
      if (!ns1 && link1) {
        const o = getItemById(link1);
        ns1 = o ? o.netns : null;
      }
      if (!ns2 && link2) {
        const o = getItemById(link2);
        ns2 = o ? o.netns : null;
      }
    }
    this.devparams1 = new NetDevParamsModel(`dev1@${this.id}`, `${name}.dev1`,
      type, ns1, this.subnets, undefined);
    this.devparams2 = new NetDevParamsModel(`dev2@${this.id}`, `${name}.dev2`,
      type, ns2, this.subnets, undefined);
  }

  getL2Devs() {
    if (this.mode !== 'vxlan' && this.mode !== 'l2tp')
      return null;

    return [this.devparams1, this.devparams2];
  }

  toDict(getDictIdbyId) {
    if (!this.mode || !this.subnets || !this.link1 || !this.link2)
      return null;

    const link1 = getDictIdbyId(this.link1);
    const link2 = getDictIdbyId(this.link2);

    if (!link1 || !link2)
      return null;

    let ret = {
      name: this.name,
      mode: this.mode,
      subnets: SubnetModel.listToDict(getDictIdbyId, this.subnets),
      link1: link1,
      link2: link2,
    };

    if (this.dev1Params)
      ret.dev1 = this.dev1Params.toDict(this.mode, getDictIdbyId);
    if (this.dev2Params)
      ret.dev2 = this.dev2Params.toDict(this.mode, getDictIdbyId);

    return ret;
  }

  resolve(getIdByDictId, getItemById) {
    if (this.subnets)
      this.subnets = SubnetModel.listFromDict(getIdByDictId, this.subnets);

    let dev1Netns = null;
    let dev2Netns = null;

    if (this.link1) {
      this.link1 = getIdByDictId(this.link1);
      dev1Netns = getItemById(this.link1).netns;
    }
    if (this.link2) {
      this.link2 = getIdByDictId(this.link2);
      dev2Netns = getItemById(this.link2).netns;
    }
    if (this.dev1Params && this.dev1Params.netns) {
      dev1Netns = getIdByDictId(this.dev1Params.netns);
      this.dev1Params.netns = dev1Netns;
    }

    if (this.dev2Params && this.dev2Params.netns) {
      dev2Netns = getIdByDictId(this.dev2Params.netns);
      this.dev2Params.netns = dev2Netns;
    }

    this.devparams1.netns = dev1Netns;
    this.devparams2.netns = dev2Netns;
  }

  static fromDict(type, params) {
    let dev1Params = null;
    let dev2Params = null;
    if (params.dev1) {
      const dev = params.dev1;
      dev1Params = new TunnelDeviceParams(dev.mode, dev.netns);
    }
    if (params.dev2) {
      const dev = params.dev2;
      dev2Params = new TunnelDeviceParams(dev.mode, dev.netns);
    }
    return new TunnelModel(null, params.name, type, params.mode, params.subnets,
      params.link1, params.link2, dev1Params, dev2Params);
  }
}
