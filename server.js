const express = require('express');
const Datastore = require('nedb');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
// Use process.env.PORT provided by hosting environment, or default to 5000
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Bind to 0.0.0.0 for external access

// Initialize NeDB database
// It will create 'data/content.db' if it doesn't exist
const contentDb = new Datastore({ filename: path.join(__dirname, 'data', 'content.db'), autoload: true });

// Middleware
app.use(bodyParser.json()); // To parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from the 'public' directory

// --- API Endpoints ---

// GET all content (for the admin page list)
app.get('/api/content', (req, res) => {
    contentDb.find({}, (err, docs) => {
        if (err) {
            console.error('Error fetching all content:', err);
            return res.status(500).json({ error: 'Failed to fetch content' });
        }
        res.json(docs);
    });
});

// GET content by slug (for displaying on HTML pages)
app.get('/api/content/:slug', (req, res) => {
    const slug = req.params.slug;
    contentDb.findOne({ slug: slug }, (err, doc) => {
        if (err) {
            console.error(`Error fetching content for slug ${slug}:`, err);
            return res.status(500).json({ error: 'Failed to fetch content' });
        }
        if (!doc) {
            return res.status(404).json({ error: 'Content not found' });
        }
        res.json(doc);
    });
});

// POST to create or update content
app.post('/api/content', (req, res) => {
    const { _id, title, slug, category, htmlContent } = req.body;

    if (!title || !slug || !htmlContent) {
        return res.status(400).json({ error: 'Title, slug, and HTML content are required.' });
    }

    const contentData = {
        title,
        slug,
        category: category || 'General', // Default category if not provided
        htmlContent,
        lastModified: new Date()
    };

    if (_id) {
        // Update existing content
        contentDb.update({ _id: _id }, { $set: contentData }, {}, (err, numReplaced) => {
            if (err) {
                console.error('Error updating content:', err);
                return res.status(500).json({ error: 'Failed to update content' });
            }
            if (numReplaced === 0) {
                return res.status(404).json({ error: 'Content not found for update' });
            }
            console.log(`Content updated: ${slug}`);
            res.json({ message: 'Content updated successfully', _id: _id });
        });
    } else {
        // Create new content
        contentData.createdAt = new Date(); // Set createdAt only for new documents
        contentDb.insert(contentData, (err, newDoc) => {
            if (err) {
                // Check for unique slug constraint (NeDB doesn't have native unique, so check manually)
                // This 'uniqueViolated' errorType would require custom handling if you add it.
                // For now, it's a generic 500 for any insert error.
                 console.error('Error creating content:', err);
                 return res.status(500).json({ error: 'Failed to create content' });
            }
            console.log(`New content created: ${newDoc.slug}`);
            res.status(201).json({ message: 'Content created successfully', _id: newDoc._id });
        });
    }
});

// DELETE content
app.delete('/api/content/:id', (req, res) => {
    const id = req.params.id;
    contentDb.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) {
            console.error(`Error deleting content with ID ${id}:`, err);
            return res.status(500).json({ error: 'Failed to delete content' });
        }
        if (numRemoved === 0) {
            return res.status(404).json({ error: 'Content not found for deletion' });
        }
        console.log(`Content deleted: ID ${id}`);
        res.json({ message: 'Content deleted successfully' });
    });
});

// --- Serve Admin UI ---
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// --- Initial Data Seeding ---
// This runs once when the server starts if the database is empty.
contentDb.count({}, (err, count) => {
    if (err) {
        console.error("Error checking DB count:", err);
        return;
    }
    if (count === 0) {
        console.log("Database is empty. Seeding initial content...");
        const initialContents = [
            {
                title: "Dashboard Overview",
                slug: "dashboard-overview",
                category: "Dashboard",
                htmlContent: `
                <div class="dashboard-grid">
                    <div class="dashboard-card primary-card">
                        <h3><i class="fas fa-coins"></i> Lead-to-Cash (L2C) Deep Dive</h3>
                        <p>Explore the end-to-end revenue generation process in telecom from lead creation to payment collection.</p>
                        <a href="bss_lead_to_cash.html" class="btn btn-primary">Go to L2C Details <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="dashboard-card secondary-card">
                        <h3><i class="fas fa-wifi"></i> Mobile Technologies</h3>
                        <p>Understand the evolution and key aspects of 3G, 4G, and 5G networks and their architectural components.</p>
                        <a href="mobile_technologies.html" class="btn btn-secondary">Explore Mobile Tech <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="dashboard-card accent-card">
                        <h3><i class="fas fa-cogs"></i> Network Fulfillment & IN</h3>
                        <p>Dive into how services are provisioned and managed within the network, including Intelligent Networks (IN).</p>
                        <a href="network_fulfillment.html" class="btn btn-accent">Learn Fulfillment <i class="fas fa-arrow-right"></i></a>
                    </div>
                    <div class="dashboard-card info-card">
                        <h3><i class="fas fa-question-circle"></i> Key Interview Questions</h3>
                        <p>Access a curated list of common and challenging interview questions.</p>
                        <a href="#" class="btn btn-info">View Questions <i class="fas fa-arrow-right"></i></a>
                    </div>
                </div>
                <section class="quick-links">
                    <h2><i class="fas fa-external-link-alt"></i> Quick Resources</h2>
                    <ul>
                        <li><a href="https://www.tmforum.org/" target="_blank"><i class="fas fa-external-link-alt"></i> TM Forum Official Website</a></li>
                        <li><a href="https://www.3gpp.org/" target="_blank"><i class="fas fa-external-link-alt"></i> 3GPP Standards</a></li>
                    </ul>
                </section>`,
                createdAt: new Date(),
                lastModified: new Date()
            },
            {
                title: "Lead-to-Cash (L2C) Process in Telecom",
                slug: "bss-lead-to-cash", // This slug matches bss_lead_to_cash.html's expected content
                category: "BSS",
                htmlContent: `
                <section class="content-block">
                    <h3>Overview</h3>
                    <p>The <strong>Lead-to-Cash (L2C)</strong> process in telecommunications is a critical, end-to-end journey that encompasses all activities from a potential customer showing initial interest to the service provider finally collecting payment for services rendered. It's the backbone of revenue generation and directly impacts customer satisfaction and operational efficiency. It's driven by a suite of interconnected Business Support Systems (BSS) that automate and manage each stage.</p>
                </section>
                <section class="content-block">
                    <h3>End-to-End Example Scenario: Customer Acquires a "Smart Home 5G Bundle"</h3>
                    <p>Imagine a customer, <strong>Sarah</strong>, who is looking for a new home internet solution that also includes entertainment and smart home features.</p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-user-plus"></i> 1. Lead Generation / Creation</h3>
                    <p>This initial stage focuses on identifying potential customers (leads) who might be interested in a service provider's offerings.</p>
                    <h4>How Leads are Created:</h4>
                    <ul>
                        <li><strong>Marketing Campaigns:</strong> Online ads, social media, TV commercials promoting new bundles.</li>
                        <li><strong>Website Forms:</strong> Customers filling out "request info" or "check availability" forms on the provider's website.</li>
                        <li><strong>Referrals:</strong> Existing customers referring new ones.</li>
                        <li><strong>Direct Sales:</strong> Cold calls, field sales.</li>
                        <li><strong>In-store Walk-ins:</strong> Physical presence at a retail outlet.</li>
                        <li><strong>API Integrations:</strong> Leads from third-party aggregators.</li>
                    </ul>
                    <h4>Key Attributes of a Lead:</h4>
                    <ul>
                        <li><strong>Lead ID:</strong> Unique identifier (e.g., LID-20250718-001).</li>
                        <li><strong>Source:</strong> Where the lead originated (e.g., "Website Form - 5G Bundle Campaign").</li>
                        <li><strong>Contact Information:</strong> Name, Email, Phone Number, Address.</li>
                        <li><strong>Initial Product Interest:
                        </strong> What they expressed interest in (e.g., "Home 5G Internet," "Smart Home Features").</li>
                        <li><strong>Timestamp:</strong> When the lead was created.</li>
                        <li><strong>Lead Status:</strong> New, Open, Contacted.</li>
                        <li><strong>Assigned Sales Rep (optional initial assignment).</strong></li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>CRM (Customer Relationship Management):</strong> The central repository for all customer and lead data. Marketing automation tools often integrate directly with the CRM.</li>
                        <li><strong>Marketing Automation Platform:</strong> Manages campaigns and captures web form submissions.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> Sarah sees an online ad for a "Smart Home 5G Bundle" and fills out a form on the telecom provider's website, expressing interest. A new lead record is automatically created in the CRM system with Lead ID: LID-20250718-001, Source: Website - Smart Home 5G Campaign, Name: Sarah Chen, Email: sarah.chen@example.com, Initial Interest: Smart Home 5G Bundle.</p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-check-circle"></i> 2. Lead Qualification</h3>
                    <p>Once a lead is created, the next step is to assess its potential. Is this a genuinely viable prospect ready to buy?</p>
                    <h4>How Leads are Qualified:</h4>
                    <ul>
                        <li><strong>Discovery Call/Engagement:</strong> Sales representatives contact the lead to understand their needs, budget, authority to purchase, and timeline (BANT criteria).</li>
                        <li><strong>Automated Scoring:</strong> CRM or marketing automation platforms might use AI/ML models to assign a "lead score" based on engagement, demographics, and expressed interest.</li>
                        <li><strong>Criteria Matching:</strong> Checking if the lead's address is serviceable, if they meet demographic targets, etc.</li>
                    </ul>
                    <h4>Key Attributes of a Qualified Lead:</h4>
                    <ul>
                        <li><strong>Qualification Status:</strong> Qualified / Unqualified / Nurturing.</li>
                        <li><strong>Qualification Score:</strong> A numerical value indicating sales readiness.</li>
                        <li><strong>Customer Needs/Requirements:</strong> Detailed notes from the discovery (e.g., "Needs high-speed internet, wants security cameras, requires easy setup").</li>
                        <li><strong>Budget & Timeline:</strong> Confirmed financial capacity and desired activation date.</li>
                        <li><strong>Assigned Sales Representative:</strong> The sales person responsible for converting this lead.</li>
                        <li><strong>Next Steps:</strong> Schedule demo, prepare quote, etc.</li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>CRM:</strong> Used by sales reps to update lead status, notes, and track interactions.</li>
                        <li><strong>AI/ML Platforms:</strong> For automated lead scoring and prediction.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> A sales development representative (SDR) calls Sarah. Sarah confirms she lives in a 5G serviceable area, needs fast internet for work-from-home, is interested in smart locks and security cameras, and wants service activated within 2 weeks. The SDR updates the lead in CRM, assigning it a Qualification Status: Qualified and a Qualification Score: 85. The lead is then assigned to a Senior Sales Account Manager, John Smith.</p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-file-invoice-dollar"></i> 3. CPQ (Configure, Price, Quote)</h3>
                    <p>This is where the qualified lead's needs are translated into a specific, priced offering.</p>
                    <h4>Purpose:</h4>
                    <p>To enable sales representatives to quickly and accurately configure complex products/services, apply correct pricing and discounts, and generate professional quotes. This prevents errors that could lead to revenue leakage or customer dissatisfaction.</p>
                    <h4>The Product Catalog (at the heart of CPQ):</h4>
                    <p>A central, master repository of all products, services, and resources a telecom provider offers. It defines what can be sold and how.</p>
                    <ul>
                        <li><strong>Structure:</strong> Follows industry standards like TM Forum's SID (Shared Information/Data) model:
                            <ul>
                                <li><strong>Product Specifications:</strong> What is offered to the customer (e.g., "5G Home Internet 500Mbps," "Smart Security Camera Service"). These are "commercial" views.</li>
                                <li><strong>Service Specifications:</strong> The logical network services required to deliver the product (e.g., "Broadband Access Service," "Video Streaming Service").</li>
                                <li><strong>Resource Specifications:</strong> The physical and logical network elements needed to deliver the service (e.g., "5G Modem," "Security Camera Device," "IP Address," "Bandwidth Allocation").</li>
                            </ul>
                        </li>
                        <li><strong>Key Attributes of Catalog Items:</strong>
                            <ul>
                                <li><code>Product ID</code>, <code>Service ID</code>, <code>Resource ID</code>.</li>
                                <li><code>Name</code>, <code>Description</code>.</li>
                                <li><code>Base Price</code> (one-time, recurring).</li>
                                <li><code>Configuration Rules</code>: e.g., "Smart Lock requires Smart Hub."</li>
                                <li><code>Compatibility Rules</code>: e.g., "5G Home Internet only available in 5G Zones."</li>
                                <li><code>Dependencies</code>: e.g., "Video Streaming Service depends on Broadband Access Service."</li>
                                <li><code>Bundles/Packages</code>: Pre-defined combinations (e.g., "Smart Home 5G Bundle" includes 5G internet, 2 cameras, 1 smart lock, and a hub).</li>
                            </ul>
                        </li>
                    </ul>
                    <h4>Configuration (<code class="language-plaintext highlighter-rouge">C</code> in CPQ):</h4>
                    <p>Sales reps select products/services. The CPQ system guides them through valid combinations based on the catalog's rules, preventing errors. For complex telecom services (e.g., VPNs, dedicated lines), this involves detailed technical parameters.</p>
                    <h4>Pricing (<code class="language-plaintext highlighter-rouge">P</code> in CPQ):</h4>
                    <p>Automatically calculates prices based on selected products, quantities, customer type, region, and applies eligible discounts, promotions, and taxes as defined in the catalog. Handles one-time charges (installation, hardware), recurring charges (monthly subscription), and usage-based charges.</p>
                    <h4>Quoting (<code class="language-plaintext highlighter-rouge">Q</code> in CPQ):</h4>
                    <p>Generates a formal document detailing the selected products/services, their prices, discounts, terms & conditions, and validity period. Often involves an approval workflow for large deals or special discounts.</p>
                    <h4>Key Attributes of a Quote:</h4>
                    <ul>
                        <li><strong>Quote ID:</strong> Unique identifier (e.g., Q-20250718-001).</li>
                        <li><strong>Quoted Products/Services:</strong> List of configured items with their specific parameters.</li>
                        <li><strong>Pricing Details:</strong> Itemized pricing (one-time, recurring), total price, applicable taxes, discounts.</li>
                        <li><strong>Quote Validity:</strong> Expiration date.</li>
                        <li><strong>Terms & Conditions:</strong> Legal clauses.</li>
                        <li><strong>Approval Status:</strong> Pending, Approved, Rejected.</li>
                        <li><strong>Customer Information:</strong> Linked to the lead/account.</li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>CPQ System:</strong> Specialized software that orchestrates configuration, pricing, and quoting.</li>
                        <li><strong>Product Catalog Management (PCM) System:</strong> Manages the lifecycle of product and service definitions that feed into CPQ.</li>
                        <li><strong>CRM:</strong> Integrates with CPQ to pass customer data and receive quote details.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> John Smith, the sales manager, logs into the CPQ system. He selects the "Smart Home 5G Bundle."
                        <ul>
                            <li><strong>Catalog View:</strong> The catalog shows Smart Home 5G Bundle (price $100/month), which includes 5G Home Internet (500Mbps), Smart Security Camera (x2), Smart Lock (x1), and Smart Hub (x1). It also offers an Optional: Premium Streaming Service for $15/month.</li>
                            <li><strong>Configuration:</strong> John adds the Premium Streaming Service as Sarah expressed interest. The CPQ system confirms compatibility.</li>
                            <li><strong>Pricing:</strong> The system automatically calculates: Base Bundle $100 + Streaming $15 = $115/month. As Sarah is a new customer, a "First 3 months 10% off" promotion is applied automatically.</li>
                            <li><strong>Quote Generation:</strong> John generates Quote ID: Q-20250718-001. The quote document is generated detailing all items, discounted price ($103.50/month for 3 months, then $115/month), and terms. He sends it to Sarah for acceptance.</li>
                        </ul>
                    </p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-clipboard-list"></i> 4. Order Capture / Sales Order Management (SOM)</h3>
                    <p>Once the customer accepts the quote, it's converted into a formal sales order.</p>
                    <h4>Purpose:</h4>
                    <p>To officially record the customer's commitment to purchase the services, initiating the fulfillment process.</p>
                    <h4>Key Attributes of a Sales Order:</h4>
                    <ul>
                        <li><strong>Sales Order ID:</strong> Unique identifier (e.g., SO-20250718-001).</li>
                        <li><strong>Customer Account ID:</strong> Links to the customer's master record.</li>
                        <li><strong>Quoted Items:</strong> References the specific quote and its line items.</li>
                        <li><strong>Final Price & Payment Terms:</strong> Confirmed billing details.</li>
                        <li><strong>Delivery/Installation Details:</strong> Desired activation date, installation address.</li>
                        <li><strong>Order Status:</strong> New, Pending Fulfillment, Completed.</li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>CRM/Order Capture Module:</strong> Often, the sales team converts the quote to an order directly within the CRM, which then passes the order to the Order Management System (OMS).</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> Sarah reviews the quote and accepts it. John logs back into the CRM/CPQ, marks Quote ID: Q-20250718-001 as accepted, and initiates the creation of Sales Order ID: SO-20250718-001. This Sales Order contains all the bundle details, pricing, and Sarah's preferred installation date.</p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-sitemap"></i> 5. Order Fulfilment / Order Management (OM / COM)</h3>
                    <p>This is a highly complex and technical stage where the commercial order is translated into technical actions and services are provisioned.</p>
                    <h4>Purpose:</h4>
                    <p>To orchestrate the delivery of services by breaking down the commercial order into actionable tasks across various network and IT systems.</p>
                    <h4>Key Technical Sub-processes:</h4>
                    <ul>
                        <li><strong>Order Decomposition:</strong> The OMS receives the sales order and decomposes the commercial products into their underlying logical services (Service Orders) and required physical/logical resources (Resource Orders).
                            <ul>
                                <li><strong>Example:</strong> "Smart Home 5G Bundle" decomposes into:
                                    <ul>
                                        <li><strong>Service Orders (SOM):</strong> "Activate 5G Broadband Service," "Enable Smart Home Platform Service," "Provision Streaming Service."</li>
                                        <li><strong>Resource Orders (ROM):</strong> "Allocate 5G Spectrum/Bandwidth," "Assign IP Address," "Deploy 5G Modem (Hardware)," "Provision 2 Security Cameras," "Provision 1 Smart Lock," "Activate Smart Home Hub."</li>
                                    </ul>
                                </li>
                            </ul>
                        </li>
                        <li><strong>Service Order Management (SOM):</strong> Manages the entire lifecycle of the logical services. This involves:
                            <ul>
                                <li><strong>Service Design:</strong> Ensuring the service can be delivered.</li>
                                <li><strong>Service Activation:</strong> Sending commands to network elements (through OSS).</li>
                                <li><strong>Service Assurance:</strong> Monitoring the service post-activation.</li>
                            </ul>
                        </li>
                        <li><strong>Resource Order Management (ROM):</strong> Manages the lifecycle of network and IT resources. This includes:
                            <ul>
                                <li><strong>Inventory Check:</strong> Confirming availability of hardware (modems, cameras) and network capacity.</li>
                                <li><strong>Resource Assignment:</strong> Allocating specific IP addresses, ports, or hardware.</li>
                                <li><strong>Resource Configuration/Provisioning:</strong> Pushing configurations to network devices.</li>
                            </ul>
                        </li>
                        <li><strong>Service Orchestration:</strong> This layer coordinates all these individual service and resource orders, managing dependencies, parallel execution, and error handling across multiple BSS and OSS (Operations Support Systems) domains. It ensures services are activated in the correct sequence.</li>
                        <li><strong>Service Handover to OSS:</strong> The OMS integrates with various OSS systems (e.g., Network Inventory, Provisioning, Activation, Fault Management) to execute the technical tasks.</li>
                    </ul>
                    <h4>Key Attributes of Orders in OM:</h4>
                    <ul>
                        <li><strong>Master Order ID:</strong> Links all sub-orders.</li>
                        <li><strong>Service Order IDs, Resource Order IDs:</strong> Unique IDs for each decomposed component.</li>
                        <li><strong>Status per Component:</strong> Pending, In Progress, Completed, Failed, Held.</li>
                        <li><strong>Dependency Management:</strong> Tracks which tasks must complete before others.</li>
                        <li><strong>Error Handling & Fallback:</strong> Mechanisms to re-try or escalate failed provisioning steps.</li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>Order Management System (OMS / COM):</strong> The central brain for orchestrating fulfillment.</li>
                        <li><strong>Service Orchestration Platform:</strong> Coordinates complex workflows across multiple systems.</li>
                        <li><strong>Inventory Management System (IMS):</strong> Tracks available resources (hardware, logical network elements).</li>
                        <li><strong>Provisioning Systems (in OSS):</strong> Directly configures network elements (e.g., routers, switches, base stations).</li>
                        <li><strong>Activation Systems (in OSS):</strong> Activates services on the network.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> Sales Order SO-20250718-001 is sent to the OMS.
                        <ul>
                            <li><strong>OMS Decomposition:</strong> Breaks it down into:
                                <ul>
                                    <li>Service Order for 5G Internet activation.</li>
                                    <li>Service Order for Smart Home platform enablement.</li>
                                    <li>Resource Orders for modem allocation, IP assignment, camera/lock provisioning.</li>
                                </ul>
                            </li>
                            <li><strong>Orchestration:</strong> The OMS workflow engine checks inventory for modem/devices. It then sends commands to the OSS provisioning systems to activate the 5G service, assign an IP, and configure the new smart devices.</li>
                            <li><strong>Status Updates:</strong> As each sub-order completes (e.g., modem provisioned, 5G activated), the status is updated in the OMS and fed back to the CRM. Sarah receives an SMS notification that her service is activated.</li>
                        </ul>
                    </p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-file-invoice"></i> 6. Billing and Invoicing</h3>
                    <p>Once services are active, the customer needs to be charged.</p>
                    <h4>Purpose:</h4>
                    <p>To accurately calculate charges for services consumed and generate invoices.</p>
                    <h4>Key Processes:</h4>
                    <ul>
                        <li><strong>Rating:</strong> Applying prices to usage events (e.g., extra data, international calls).</li>
                        <li><strong>Tariff Management:</strong> Maintaining complex pricing plans, promotions, and discounts.</li>
                        <li><strong>Invoicing:</strong> Generating periodic bills.</li>
                    </ul>
                    <h4>Key Attributes of an Invoice:</h4>
                    <ul>
                        <li><strong>Invoice ID:</strong> Unique identifier (e.g., INV-20250831-001).</li>
                        <li><strong>Billing Period:</strong> Start and end dates.</li>
                        <li><strong>Itemized Charges:</strong> Recurring fees (bundle subscription), one-time charges (installation), usage-based charges (excess data), taxes.</li>
                        <li><strong>Total Amount Due.</strong></li>
                        <li><strong>Due Date.</strong></li>
                        <li><strong>Customer Account Information.</strong></li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>Billing System:</strong> The core system for rating, charging, and invoicing.</li>
                        <li><strong>Mediation System:
                        </strong> Collects usage data from the network and transforms it for the billing system.</li>
                        <li><strong>Revenue Management System:
                        </strong> Ensures all services are correctly billed.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> At the end of the month (August), the Billing System receives usage data for Sarah's 5G plan from the Mediation system.
                        <ul>
                            <li>It calculates her recurring charge ($103.50 for the first 3 months) and any additional usage charges.</li>
                            <li>Invoice ID: INV-20250831-001 is generated, detailing her "Smart Home 5G Bundle" charge, "Premium Streaming Service," and the 10% discount applied. The invoice is sent to Sarah via email and made available on her customer portal.</li>
                        </ul>
                    </p>
                </section>
                <section class="content-block">
                    <h3 class="stage-heading"><i class="fas fa-money-check-alt"></i> 7. Collections and Payments</h3>
                    <p>The final stage ensures the telecom provider receives the money owed for services.</p>
                    <h4>Purpose:</h4>
                    <p>To manage payment reception, process outstanding balances, and handle collections for overdue accounts.</p>
                    <h4>Key Processes:</h4>
                    <ul>
                        <li><strong>Payment Processing:</strong> Receiving and recording payments (credit card, bank transfer, direct debit).</li>
                        <li><strong>Dunning & Collections:
                        </strong> Managing overdue accounts (reminders, suspensions, legal action).</li>
                        <li><strong>Dispute Management:</strong> Handling customer queries regarding bills.</li>
                    </ul>
                    <h4>Key Attributes of a Payment/Collection Event:</h4>
                    <ul>
                        <li><strong>Payment ID:</strong> Unique transaction identifier.</li>
                        <li><strong>Amount Paid.</strong></li>
                        <li><strong>Payment Method.</strong></li>
                        <li><strong>Date of Payment.</strong></li>
                        <li><strong>Payment Status:</strong> Paid, Overdue, Partially Paid, Written Off.</li>
                        <li><strong>Collection Actions Taken.</strong></li>
                    </ul>
                    <h4>Systems Involved:</h4>
                    <ul>
                        <li><strong>Payment Gateway:</strong> Processes online card payments.</li>
                        <li><strong>Collections System:</strong> Manages overdue accounts.</li>
                        <li><strong>General Ledger (in Financials/ERP):</strong> Records all revenue.</li>
                        <li><strong>Customer Self-Service Portal:
                        </strong> Allows customers to view bills and make payments.</li>
                    </ul>
                    <p class="example-box"><strong>Example (Sarah):</strong> Sarah logs into the customer portal and pays Invoice ID: INV-20250831-001 using her saved credit card.
                        <ul>
                            <li>The Payment Gateway processes the payment.</li>
                            <li>The Billing System receives confirmation, updates the invoice status to "Paid," and sends a receipt to Sarah.</li>
                            <li>The payment is recorded in the General Ledger.</li>
                        </ul>
                    </p>
                </section>`,
                createdAt: new Date(),
                lastModified: new Date()
            },
            {
                title: "Mobile Technologies (3G/4G/5G)",
                slug: "mobile-technologies",
                category: "Mobile Tech",
                htmlContent: `
                <section class="content-block">
                    <h3>Introduction to Mobile Network Generations</h3>
                    <p>This section will cover the key characteristics, architectural components, and advancements of each mobile network generation, from 3G to 5G, including their relevance in telecom solution architecture.</p>
                    <div class="accordion">
                        <div class="accordion-item">
                            <button class="accordion-header">
                                <i class="fas fa-mobile-alt"></i> 3G (Third Generation)
                                <i class="fas fa-chevron-down accordion-icon"></i>
                            </button>
                            <div class="accordion-content">
                                <p><strong>Key Features:</strong> Introduced mobile broadband, enabling web Browse, email, and basic video calls on mobile devices. Data rates significantly higher than 2G. Technologies like UMTS (W-CDMA).</p>
                                <p><strong>Architectural Components:</strong> Focus on Circuit Switching for voice and Packet Switching for data. Core Network elements like MSC (Mobile Switching Center), GGSN (Gateway GPRS Support Node), SGSN (Serving GPRS Support Node).</p>
                                <p><em>(Add more details, diagrams, and examples here.)</em></p>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <button class="accordion-header">
                                <i class="fas fa-tachometer-alt"></i> 4G (Fourth Generation) / LTE
                                <i class="fas fa-chevron-down accordion-icon"></i>
                            </button>
                            <div class="accordion-content">
                                <p><strong>Key Features:</strong> All-IP network, much higher data rates (up to 100 Mbps or more), low latency, support for HD mobile video, online gaming. Introduced LTE (Long-Term Evolution) as the primary technology.</p>
                                <p><strong>Architectural Components:</strong> Flat IP architecture with Evolved Packet Core (EPC) consisting of MME (Mobility Management Entity), S-GW (Serving Gateway), P-GW (Packet Data Network Gateway), HSS (Home Subscriber Server).</p>
                                <p><em>(Add more details, diagrams, and examples here.)</em></p>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <button class="accordion-header">
                                <i class="fas fa-rocket"></i> 5G (Fifth Generation)
                                <i class="fas fa-chevron-down accordion-icon"></i>
                            </button>
                            <div class="accordion-content">
                                <p><strong>Key Features:</strong> Designed for extreme mobile broadband (eMBB), ultra-reliable low-latency communications (URLLC), and massive machine-type communications (mMTC). Supports network slicing, edge computing, higher capacities, and very low latency.</p>
                                <p><strong>Architectural Components:</strong> Service-Based Architecture (SBA) with a cloud-native core (5GC). Key functions like AMF (Access and Mobility Management Function), SMF (Session Management Function), UPF (User Plane Function), AUSF (Authentication Server Function), UDM (Unified Data Management), PCF (Policy Control Function).</p>
                                <p><em>(Add more details, diagrams, and examples here.)</em></p>
                            </div>
                        </div>
                    </div>
                </section>`,
                createdAt: new Date(),
                lastModified: new Date()
            },
            {
                title: "Network Fulfillment & Intelligent Networks (IN)",
                slug: "network-fulfillment",
                category: "Network",
                htmlContent: `
                <section class="content-block">
                    <h3>Network Fulfillment Process</h3>
                    <p>Network fulfillment refers to the processes and systems that activate, provision, and ensure the delivery of telecom services on the underlying network infrastructure. It's the bridge between the BSS (commercial layer) and OSS (operations layer).</p>
                    <div class="accordion">
                        <div class="accordion-item">
                            <button class="accordion-header">
                                <i class="fas fa-tasks"></i> Key Stages of Network Fulfillment
                                <i class="fas fa-chevron-down accordion-icon"></i>
                            </button>
                            <div class="accordion-content">
                                <ul>
                                    <li><strong>Service Order Activation:</strong> Translating commercial orders into technical commands.</li>
                                    <li><strong>Resource Provisioning:</strong> Allocating and configuring network resources (e.g., bandwidth, IP addresses, ports).</li>
                                    <li><strong>Inventory Management:</strong> Keeping track of all physical and logical assets.</li>
                                    <li><strong>Activation & Testing:</strong> Activating the service on the network and verifying its functionality.</li>
                                    <li><strong>Fault & Performance Management:
                                    </strong> Monitoring the network for issues and ensuring quality of service (QoS).</li>
                                </ul>
                                <p><em>(Add more details, systems involved like NMS, EMS, OSS components.)</em></p>
                            </div>
                        </div>
                        <div class="accordion-item">
                            <button class="accordion-header">
                                <i class="fas fa-brain"></i> Intelligent Network (IN) Concepts
                                <i class="fas fa-chevron-down accordion-icon"></i>
                            </button>
                            <div class="accordion-content">
                                <p>Intelligent Networks (IN) are a telecom network architecture that enables flexible and rapid introduction of new services without requiring changes to the core switching infrastructure.</p>
                                <p><strong>Key Components:</strong>
                                    <ul>
                                        <li><strong>SSP (Service Switching Point):</strong> Recognizes IN calls and queries the SCP.</li>
                                        <li><strong>SCP (Service Control Point):</strong> Contains the service logic and data.</li>
                                        <li><strong>SDP (Service Data Point):</strong> Stores subscriber data.</li>
                                        <li><strong>SMP (Service Management Point):
                                        </strong> For service creation and management.</li>
                                    </ul>
                                </p>
                                <p><strong>Common IN Services:</strong> Freephone (800 numbers), Premium Rate Services, Virtual Private Networks, Mobile Virtual Network Operators (MVNOs).</p>
                                <p><em>(Add more details, diagrams, and examples here.)</em></p>
                            </div>
                        </div>
                    </div>
                </section>`,
                createdAt: new Date(),
                lastModified: new Date()
            }
        ];

        contentDb.insert(initialContents, (err, newDocs) => {
            if (err) console.error("Error seeding initial content:", err);
            else console.log(`Seeded ${newDocs.length} initial content items.`);
        });
    }
});

// Start the server
app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
    console.log(`Access your app at the external URL provided by Replit (e.g., https://your-repl-name.your-username.replit.dev)`);
});