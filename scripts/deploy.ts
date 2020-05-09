import axios from 'axios';
import axiosCookieJarSupport from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import cheerio from 'cheerio';
import FormData from 'form-data';
import path from 'path';
import fs from 'fs';
import axiosRetry from 'axios-retry';
import packageJson from '../package.json';

enum EScreenshotTypePreference {
    AUTO = 'auto',
    NONE = 'none'
}

enum ELicense {
    DEFAULT = '',
    publicdomain = 'publicdomain',
    CCBY = 'ccby',
    CCBYSA = 'ccbysa',
    CCBYND = 'ccbynd',
    CCBYNC = 'ccbync',
    CCBYNCSA = 'ccbyncsa',
    CCBYNCND = 'ccbyncnd',
    ARR = 'arr'
}

const userstylesConf = packageJson.userstyles;

const styleId: number = userstylesConf.id;
const login = process.env.USERSTYLES_LOGIN;
const password = process.env.USERSTYLES_PWD;

if (!styleId || !login || !password) {
    throw new Error('configurations styleId, login and password are mandatory');
}

const short_description = null;
const long_description = null;
const additional_info = null;
const css_file = path.join(__dirname, '..', userstylesConf.css_file);
const example_url = null;
const screenshot_type_preference: EScreenshotTypePreference = null;
const license: ELicense = null;
const css = null;

const timeout = 300000;
const baseURL = 'https://userstyles.org/';
let $: CheerioStatic;

let data: Record<string, string>;
let formData: FormData;

const checkErrors = (html: string): number => {
    const $$ = cheerio.load(html);
    const errors = $$('.error');
    errors.each((i, obj) => {
        console.log(obj, i);
        console.error(obj.childNodes[0].data);
    });
    return errors.length;
};

const main = async (): Promise<void> => {
    const jar = new CookieJar();
    const axiosInstance = axios.create({ baseURL, withCredentials: true, jar, timeout });
    axiosCookieJarSupport(axiosInstance);
    axiosRetry(axiosInstance, { retries: 3 });

    //get authenticate page
    console.log('get authentication');
    const authenticatePage = (
        await axiosInstance.get('/d/login', {
            params: {
                view: 'password'
            }
        })
    ).data;

    $ = cheerio.load(authenticatePage);

    data = {};
    $('#password-login')
        .serializeArray()
        .forEach((field) => {
            data[field.name] = field.value;
        });
    data.login = login;
    data.password = password;

    const loginData = new URLSearchParams();
    Object.entries(data).forEach(([k, v]) => {
        loginData.append(k, typeof v !== typeof true ? v : v ? 'true' : 'false');
    });

    console.log('authenticate');
    const authResult = await axiosInstance.post('/login/authenticate_normal', loginData, {
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        jar,
        withCredentials: true
    });

    // console.log(authResult);
    if (checkErrors(authResult.data) > 0) {
        throw new Error('fail to authenticate');
    }

    console.log('get the style page');
    const styleEditPage = (
        await axiosInstance.get(`/d/styles/${styleId}/edit`, {
            jar,
            withCredentials: true
        })
    ).data;

    $ = cheerio.load(styleEditPage);

    const form = $('form[action="/styles/update"]');
    if (!form) {
        throw new Error("can't find a form to edit the project");
    }

    //reset data
    data = {};
    const styleData = new FormData();
    form.serializeArray().forEach(({ name, value }) => {
        data[name] = value;
    });

    //check data
    if (styleId.toString() != data['style[id]']) {
        throw new Error(`id seems incorrect, styleId : ${styleId}, style[id] : ${data['style[id]']}`);
    }

    //update data from config
    if (short_description) {
        data['style[short_description]'] = short_description;
    }

    if (long_description) {
        data['style[long_description]'] = long_description;
    }

    if (additional_info) {
        data['style[additional_info]'] = additional_info;
    }

    if (css_file || css) {
        let cssCode: string;
        if (css) {
            cssCode = css;
        } else {
            if (!fs.existsSync(css_file)) {
                throw new Error(`css file "${css_file}", seems to doesn't exist`);
            }
            cssCode = fs.readFileSync(css_file).toString();
        }

        data['style[style_code_attributes][code]'] = cssCode;
    }

    if (example_url) {
        data['style[screenshot_url_override]'] = example_url;
    }

    if (screenshot_type_preference) {
        data['style[screenshot_type_preference]'] = screenshot_type_preference;
    }

    if (license) {
        data['style[license]'] = license;
    }

    Object.entries(data).forEach(([name, value]) => {
        styleData.append(name, value);
    });

    console.log('update the style');
    // console.log(styleData);
    const updatePage = await axiosInstance.post(`/styles/update`, styleData, {
        jar,
        withCredentials: true,
        maxRedirects: 0,
        headers: {
            ...styleData.getHeaders(),
            referer: `${axiosInstance.defaults.baseURL}/d/styles/${styleId}/edit`
        },
        validateStatus: function (status) {
            return status < 400;
        }
    });

    console.log(updatePage.data);
    checkErrors(updatePage.data);
    //check if regex match
    if (!updatePage.data.match(/It might take about [0-9]+ minutes for changes to take effect\./gm)) {
        throw new Error('it seems that updating the style fail');
    }
};

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
