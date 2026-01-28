<?xml version="1.0" encoding="utf-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
                xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" version="1.0" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml" lang="tr">
      <head>
        <title><xsl:value-of select="/rss/channel/title"/> - RSS Feed</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style type="text/css">
          * {
            box-sizing: border-box;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 2rem 1rem;
            background: #f8f9fa;
            color: #1a1a2e;
          }
          .header {
            text-align: center;
            margin-bottom: 2rem;
            padding: 2rem;
            background: white;
            border-radius: 12px;
            border: 1px solid #e9ecef;
          }
          .header h1 {
            margin: 0 0 0.5rem;
            color: #e63946;
          }
          .header p {
            margin: 0;
            color: #4a4a68;
          }
          .info-box {
            background: #fff8e6;
            border: 1px solid #f0c36d;
            padding: 1rem;
            border-radius: 8px;
            margin-bottom: 2rem;
            font-size: 0.9rem;
          }
          .info-box strong {
            color: #8a6d3b;
          }
          .article {
            background: white;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 1.25rem;
            margin-bottom: 1rem;
          }
          .article h2 {
            margin: 0 0 0.5rem;
            font-size: 1.1rem;
          }
          .article h2 a {
            color: #1a1a2e;
            text-decoration: none;
          }
          .article h2 a:hover {
            color: #e63946;
          }
          .article .meta {
            font-size: 0.8rem;
            color: #4a4a68;
            margin-bottom: 0.5rem;
          }
          .article .summary {
            font-size: 0.9rem;
            color: #4a4a68;
            margin: 0;
          }
          .footer {
            text-align: center;
            margin-top: 2rem;
            font-size: 0.875rem;
            color: #4a4a68;
          }
          .footer a {
            color: #0066cc;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📊 <xsl:value-of select="/rss/channel/title"/></h1>
          <p><xsl:value-of select="/rss/channel/description"/></p>
        </div>
        
        <div class="info-box">
          <strong>ℹ️ Bu bir RSS feed'idir.</strong> 
          Bu URL'yi RSS okuyucunuza ekleyerek yeni haberleri takip edebilirsiniz.
        </div>
        
        <xsl:for-each select="/rss/channel/item">
          <article class="article">
            <h2>
              <a>
                <xsl:attribute name="href">
                  <xsl:value-of select="link"/>
                </xsl:attribute>
                <xsl:value-of select="title"/>
              </a>
            </h2>
            <div class="meta">
              <xsl:value-of select="pubDate"/>
            </div>
            <p class="summary">
              <xsl:value-of select="description"/>
            </p>
          </article>
        </xsl:for-each>
        
        <div class="footer">
          <p>
            <a href="/">← Ana Sayfaya Dön</a>
          </p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
