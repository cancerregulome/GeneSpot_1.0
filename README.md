# WebAppTemplate #
This Web Application Template is meant to standardize the development of new HTML5 web applications and web services
in the Cancer Regulome project.  It allows our team to reduce development and maintainance time, and supports
rapid prototyping.

> **Operating System Support**
> The example commands in this file are directed at Linux and Mac OS X users.  However, it should be expected (unless
> explicitly noted) that these technologies are supported by the Windows operating system.

> **Browser Support**
> The web applications developed using this template will adopt the HTML5 standard.  Backwards compatibility
> with some older generation browsers is resolved through use of Google Chrome Frame (http://www.google.com/chromeframe).
> We will work to ensure that this template supports mobile devices and tablets using HTML5 web browsers.  But
> we will focus our testing efforts to the most commonly-used platforms: iOS and Android.

# Application Configuration #
> Configuration files **SHOULD NOT** be checked-in to individual project repositories.

This template specifies the following configuration files (see examples in **app_root/examples**):

## proxy.json ##
  * Location: **app_root/examples**
  * Provides information to npm dev server
  * Configures remote and local proxies to web services

## ningx.conf ##
  * Location: **nginx_root**
  * Provides information to NGINX web server
  * Configures remote and local proxies to web services

Runtime Configuration
-----
* This template is meant to be used in conjunction with https://github.com/cancerregulome/OAuthWebServices
* The following files are served through the /svc/configurations base URI

## display.json ##
 * Location: web services configurations path
 * Specifies identifying UI elements (e.g. titles, links in the About menu)
 * Specifies links to Hangout URL

### Example configuration ###
```json
{
    "title":"TCGA Cancer Regulome :: Example",
    "hangoutUrl":"https://plus.google.com/hangouts/_?gid={app-gid}",
    "aboutLinks":[
        {
            "label":"TCGA Home",
            "url":"http://cancergenome.nih.gov"
        }
    ]
}
```

## datamodel.json ##
 * Location: web services configurations path
 * Specifies data source elements such as files, directories, and data services available to the application
 * Includes information such as labels and data types

> This file allows the application to dynamically associate data sources to UI views

### Example configuration ###
```json
{
    "data_sets":{
        "label":"Data Sets",
        "mutations":{
            "label":"Mutations",
            "catalog":{
                "Protein_Mutations_Per_Cancer_Type":{
                    "id":"Protein_Mutations_Per_Cancer_Type",
                    "label":"Protein Mutations Per Cancer Type",
                    "service":"lookups/mutations",
                    "description":"This dataset was prepared from TCGA MAF files produced by Firehose",
                    "provenance":"provenance_v7_23nov_2012.txt",
                    "model":"Mutations"
                },
                "mutsig_rankings":{
                    "id":"mutsig_rankings",
                    "label":"MutSig Rankings",
                    "service":"lookups/mutsig_rankings",
                    "description":"This dataset was prepared from TCGA MutSig 2.0 data produced by Firehose"
                },
                "mutsig_top20":{
                    "id":"mutsig_top20",
                    "label":"MutSig Top20",
                    "service":"mutsig_rankings"
                },
                "mutsig_provenance":{
                    "id":"mutsig_provenance",
                    "label":"MutSig Provenance",
                    "service":"data/provenance/mutsig_provenance.json"
                }
            }
        }
    }
}
```

## Data Model View Mappings ##
| Model | Description | Views |
| --- | --- | --- |
| FeatureMatrix | todo: fill this table | Grid, StacksVis |

> **TODO** Further documentation of data model and views

# Initial Dev Setup #
1. Clone this repository
2. Install required dependencies (see https://github.com/cancerregulome/WebAppBase/blob/master/INSTALL.md)
3. Start web services (see https://github.com/cancerregulome/OAuthWebServices)
4. Execute ```grunt server &```
5. Open browser at http://localhost:9010
